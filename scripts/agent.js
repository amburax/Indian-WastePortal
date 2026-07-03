/**
 * ═══════════════════════════════════════════════════════════════
 *  Indian Waste Portal — Autonomous CPCB SWM Portal Filing Agent
 *  File: scripts/agent.js
 *
 *  Run: node scripts/agent.js
 *       (or triggered via cron / internal webhook)
 *
 *  Behavior:
 *   1. Queries DB for orgs with status = 'Paid'
 *   2. For each paid org, opens a Playwright browser
 *   3. Navigates to CPCB SWM portal and fills registration form
 *   4. Extracts Acknowledgement Number
 *   5. Updates DB status → 'Completed', saves ACK number
 * ═══════════════════════════════════════════════════════════════
 */

import { chromium }   from 'playwright';
import Database       from 'better-sqlite3';
import path           from 'path';
import fs             from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH    = process.env.DATABASE_PATH || './indianwasteportal.db';
const PORTAL_URL = process.env.CPCB_PORTAL_URL || 'https://swm.cpcb.gov.in';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'agent-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ── DB helpers ────────────────────────────────────────────
function getDb() {
  const db = new Database(path.resolve(process.cwd(), DB_PATH));
  db.pragma('foreign_keys = ON');
  return db;
}

function log(db, orgId, step, status, message, screenshotPath = null) {
  console.log(`[Agent][${step}][${status}] ${message}`);
  try {
    db.prepare(`
      INSERT INTO agent_logs (id, org_id, step, status, message, screenshot)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), orgId, step, status, message, screenshotPath);
  } catch (e) {
    // Non-fatal logging error
    console.error('Log write error:', e.message);
  }
}

// ── Screenshot helper ─────────────────────────────────────
async function screenshot(page, orgId, stepName) {
  const filename = `${orgId.slice(0, 8)}_${stepName}_${Date.now()}.png`;
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

// ── Main agent loop ───────────────────────────────────────
async function runAgent() {
  const db   = getDb();
  const orgs = db.prepare("SELECT * FROM organizations WHERE status IN ('Paid', 'Queued') ORDER BY queue_position ASC").all();

  if (orgs.length === 0) {
    console.log('[Agent] No paid organizations pending. Exiting.');
    db.close();
    return;
  }

  console.log(`[Agent] Found ${orgs.length} paid org(s) to process.`);

  for (const org of orgs) {
    console.log(`\n[Agent] ── Processing org: ${org.org_name} (${org.id}) ──`);
    await processOrg(db, org);
  }

  db.close();
  console.log('\n[Agent] All orgs processed. Done.');
}

// ── Process a single org ──────────────────────────────────
async function processOrg(db, org) {
  // Fetch related data
  const metrics = db.prepare('SELECT * FROM metrics WHERE org_id = ?').get(org.id);
  const address = db.prepare('SELECT * FROM lgd_addresses WHERE org_id = ?').get(org.id);

  if (!metrics || !address) {
    log(db, org.id, 'preflight', 'error', 'Missing metrics or address data — skipping.');
    return;
  }

  // Mark as In Progress
  db.prepare("UPDATE organizations SET status = 'In Progress' WHERE id = ?").run(org.id);
  log(db, org.id, 'preflight', 'success', 'Status set to In Progress. Launching browser.');

  let browser;
  try {
    // ── Launch Playwright ─────────────────────────────────
    browser = await chromium.launch({
      headless: true,   // Set to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      viewport:  { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ── Navigate to Portal ────────────────────────────────
    log(db, org.id, 'navigate', 'success', `Navigating to ${PORTAL_URL}`);
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 30_000 });

    const ss1 = await screenshot(page, org.id, 'homepage');
    log(db, org.id, 'navigate', 'success', 'Portal loaded', ss1);

    // ── Find and click "Register" / "New Registration" ────
    // NOTE: Selectors below are based on the known CPCB SWM portal structure.
    // Update selectors if the portal DOM changes.

    const registerLink = page.locator('a:has-text("Register"), a:has-text("New Registration"), button:has-text("Register")').first();
    if (await registerLink.isVisible({ timeout: 8000 })) {
      await registerLink.click();
      await page.waitForLoadState('networkidle');
      log(db, org.id, 'navigate', 'success', 'Clicked Register link');
    } else {
      // Try direct URL for registration form
      await page.goto(`${PORTAL_URL}/registration`, { waitUntil: 'networkidle', timeout: 15_000 });
      log(db, org.id, 'navigate', 'success', 'Navigated directly to /registration');
    }

    // ── STEP 1: Basic Organisation Details ────────────────
    await fillStep1(page, db, org, address);
    const ss2 = await screenshot(page, org.id, 'after_step1');
    log(db, org.id, 'fill_step1', 'success', 'Step 1 fields filled', ss2);

    // ── STEP 2: Waste Metrics ─────────────────────────────
    await fillStep2(page, db, org, metrics);
    const ss3 = await screenshot(page, org.id, 'after_step2');
    log(db, org.id, 'fill_step2', 'success', 'Step 2 fields filled', ss3);

    // ── Submit and extract ACK ────────────────────────────
    const ackNumber = await submitAndExtractAck(page, db, org);

    if (ackNumber) {
      // ✅ Success
      db.prepare("UPDATE organizations SET status = 'Completed', ack_number = ? WHERE id = ?")
        .run(ackNumber, org.id);
      log(db, org.id, 'complete', 'success', `ACK Number extracted: ${ackNumber}`);
      console.log(`✅ [Agent] Completed! ACK: ${ackNumber}`);
    } else {
      throw new Error('Could not extract Acknowledgement Number from portal response');
    }

  } catch (err) {
    console.error(`[Agent] ❌ Error processing org ${org.id}:`, err.message);
    log(db, org.id, 'error', 'error', err.message);

    // Revert to Paid so it can be retried
    db.prepare("UPDATE organizations SET status = 'Paid' WHERE id = ?").run(org.id);

  } finally {
    if (browser) await browser.close();
  }
}

// ── Fill Step 1: Organisation & Contact ───────────────────
async function fillStep1(page, db, org, address) {
  log(db, org.id, 'fill_step1', 'success', 'Filling Step 1 — Organisation details');

  // Helper: fill if selector exists
  async function tryFill(selector, value, description) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.fill(String(value));
        console.log(`  → Filled [${description}]: ${value}`);
      }
    } catch {
      console.log(`  → Skipped [${description}] (not found)`);
    }
  }

  async function trySelect(selector, value, description) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.selectOption({ label: value });
        console.log(`  → Selected [${description}]: ${value}`);
      }
    } catch {
      try {
        // Try selecting by value if label fails
        const el = page.locator(selector).first();
        await el.selectOption({ value });
      } catch {
        console.log(`  → Skipped [${description}] (not found or option unavailable)`);
      }
    }
  }

  // Organisation name fields
  await tryFill('input[name*="orgName"], input[id*="orgName"], input[placeholder*="Organisation"]', org.org_name, 'Org Name');
  await tryFill('input[name*="org_name"], #organisationName', org.org_name, 'Org Name alt');

  // Category (replaces V1 org_type)
  await trySelect('select[name*="category"], select[id*="category"], #category', org.category, 'Category');

  // Sub-category
  await page.waitForTimeout(600);
  await trySelect('select[name*="subCategory"], select[name*="sub_category"], #subCategory', org.sub_category, 'Sub-category');

  // Authorised person (replaces V1 contact_name)
  await tryFill('input[name*="authorizedPerson"], input[name*="auth_person"], input[placeholder*="Authorised"]', org.auth_person, 'Authorised Person');
  await tryFill('input[name*="contactName"], input[id*="contactName"]', org.auth_person, 'Contact Name alt');

  // Email
  await tryFill('input[type="email"], input[name*="email"], input[id*="email"]', org.email, 'Email');

  // Phone
  await tryFill('input[type="tel"], input[name*="phone"], input[name*="mobile"], input[id*="mobile"]', org.phone, 'Phone');

  // State
  await trySelect('select[name*="state"], select[id*="state"]', address.state_name, 'State');
  await page.waitForTimeout(800); // Wait for district dropdown to populate

  // District
  await trySelect('select[name*="district"], select[id*="district"]', address.district_name, 'District');
  await page.waitForTimeout(500);

  // City
  await tryFill('input[name*="city"], input[id*="city"], select[name*="city"]', address.city_name, 'City');

  // PIN
  if (address.pincode) {
    await tryFill('input[name*="pin"], input[name*="pincode"], input[id*="pin"]', address.pincode, 'PIN');
  }

  // Full address
  if (address.full_address) {
    await tryFill('textarea[name*="address"], input[name*="address"]', address.full_address, 'Address');
  }

  // Sub-district / Taluka (V2 field)
  if (address.sub_district) {
    await tryFill('input[name*="subDistrict"], input[name*="taluka"], input[placeholder*="Taluka"]', address.sub_district, 'Sub-district/Taluka');
  }

  // Local body type (V2 field)
  if (address.local_body_type) {
    await trySelect('select[name*="localBody"], select[id*="localBody"], #localBodyType', address.local_body_type, 'Local Body Type');
  }

  // Click Next / Save Step 1
  const nextBtn = page.locator('button:has-text("Next"), button:has-text("Save & Next"), input[value="Next"]').first();
  if (await nextBtn.isVisible({ timeout: 5000 })) {
    await nextBtn.click();
    await page.waitForLoadState('networkidle');
  }
}

// ── Fill Step 2: Waste Generation Metrics ─────────────────
async function fillStep2(page, db, org, metrics) {
  log(db, org.id, 'fill_step2', 'success', 'Filling Step 2 — Waste metrics');

  async function tryFill(selector, value, description) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.fill(String(value));
        console.log(`  → Filled [${description}]: ${value}`);
      }
    } catch {
      console.log(`  → Skipped [${description}]`);
    }
  }

  // Floor area
  await tryFill(
    'input[name*="floorArea"], input[name*="floor_area"], input[id*="floorArea"], input[placeholder*="Floor Area"]',
    metrics.floor_area_sqm || 0,
    'Floor Area (sqm)',
  );

  // Waste generation
  await tryFill(
    'input[name*="wasteGeneration"], input[name*="waste_kg"], input[id*="wasteGen"], input[placeholder*="Waste Generation"]',
    metrics.waste_kg_per_day || 0,
    'Waste (kg/day)',
  );

  // Water consumption
  await tryFill(
    'input[name*="waterConsumption"], input[name*="water"], input[id*="water"], input[placeholder*="Water"]',
    metrics.water_liters_per_day || 0,
    'Water (L/day)',
  );

  // Number of staff / residents (common field)
  // Skip if not present — not critical

  // Click Next / Save Step 2
  const nextBtn = page.locator('button:has-text("Next"), button:has-text("Save & Next"), button:has-text("Submit"), input[value="Next"]').first();
  if (await nextBtn.isVisible({ timeout: 5000 })) {
    await nextBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  }
}

// ── Submit & Extract ACK Number ───────────────────────────
async function submitAndExtractAck(page, db, org) {
  log(db, org.id, 'submit', 'success', 'Submitting form and waiting for ACK number');

  // Click final Submit if present
  const submitBtn = page.locator('button:has-text("Submit"), input[type="submit"][value*="Submit"], button:has-text("Final Submit")').first();
  if (await submitBtn.isVisible({ timeout: 5000 })) {
    await submitBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  }

  await page.waitForTimeout(2000);

  const ss = await screenshot(page, org.id, 'after_submit');
  log(db, org.id, 'submit', 'success', 'Form submitted', ss);

  // ── Extract ACK number ───────────────────────────────────
  // Try multiple patterns — CPCB portal usually shows the ACK in:
  //  - A div/span with text like "Acknowledgement No: SWMXXX"
  //  - A table cell
  //  - A paragraph after "successfully registered"

  const patterns = [
    // Text content patterns
    async () => {
      const text = await page.evaluate(() => document.body.innerText);
      const match = text.match(/Acknowledgement\s*(?:No\.?|Number)[\s:]*([A-Z0-9\-\/]+)/i);
      return match?.[1]?.trim();
    },
    // Specific selectors
    async () => {
      const el = page.locator('[id*="ack"], [class*="ack"], [id*="registrationNo"], span:has-text("SWM"), td:has-text("SWM")').first();
      if (await el.isVisible({ timeout: 3000 })) {
        return (await el.innerText()).trim().replace(/[^A-Z0-9\-\/]/gi, '').slice(0, 30);
      }
    },
    // Regex on full page text
    async () => {
      const text = await page.evaluate(() => document.body.innerText);
      const match = text.match(/SWM[A-Z0-9\/\-]{5,30}/i);
      return match?.[0]?.trim();
    },
    // Registration number field
    async () => {
      const el = page.locator('input[name*="regNo"], input[readonly][value]').first();
      if (await el.isVisible({ timeout: 3000 })) {
        return await el.inputValue();
      }
    },
  ];

  for (const pattern of patterns) {
    const ack = await pattern().catch(() => null);
    if (ack && ack.length >= 5) {
      return ack;
    }
  }

  // Final fallback: return a synthetic ACK for demo mode
  // (only used if portal doesn't return one — remove in production)
  if (process.env.AGENT_DEMO_MODE === 'true') {
    const demoAck = `SWM-DEMO-${org.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
    log(db, org.id, 'submit', 'success', `Demo mode: Generated synthetic ACK: ${demoAck}`);
    return demoAck;
  }

  return null;
}

// ── Entry point ───────────────────────────────────────────
runAgent().catch((err) => {
  console.error('[Agent] Fatal error:', err);
  process.exit(1);
});
