/**
 * ═══════════════════════════════════════════════════════════════
 *  Indian Waste Portal V2 — Full 5-Step CPCB SWM Portal Playwright Agent
 *  File: workers/playwright-agent.js
 *
 *  Mirrors exactly the 5-step workflow on swm.cpcb.gov.in:
 *    Step 1 → Account creation (org_name, auth_person, email, mobile)
 *    Step 2 → Organisation + address details (full LGD fields)
 *    Step 3 → Verify Details (auto-bypass: just click Next)
 *    Step 4 → Accept Terms & Conditions (check 3 declaration boxes)
 *    Step 5 → Submit → extract ACK number
 *
 *  This file is called by queue-consumer.js for each job.
 *  It is NOT called directly from API routes (that would be synchronous).
 * ═══════════════════════════════════════════════════════════════
 */

import { chromium }      from 'playwright';
import path              from 'path';
import fs                from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID }    from 'crypto';

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const PORTAL_URL     = process.env.CPCB_PORTAL_URL || 'https://swm.cpcb.gov.in';
const DEMO_MODE      = process.env.AGENT_DEMO_MODE === 'true';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'agent-screenshots');
const HEADLESS       = process.env.AGENT_HEADLESS !== 'false';  // default headless

// Ensure screenshot dir exists
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ── Timeouts (ms) ─────────────────────────────────────────────
const T = {
  NAV:     30_000,   // Page navigation
  LOAD:    15_000,   // Wait for element
  ACTION:   3_000,   // Short waits (dropdown populate, etc.)
  SUBMIT:  20_000,   // Final submit + response
};

/**
 * Run the full 5-step filing agent for one org payload.
 *
 * @param {object} payload  - Full agent payload from queue job (built in payment-webhook)
 * @param {object} logger   - { log(step, status, msg, screenshotPath?) }
 * @param {object} db       - Database connection
 * @param {string} jobId    - Queue job ID
 * @returns {Promise<{ackNumber: string, portalStatus: string}>}
 */
export async function runFilingAgent(payload, logger, db = null, jobId = null) {
  const { org_id } = payload;
  const log = (...args) => logger.log(...args);

  if (DEMO_MODE) {
    return await runDemoMode(payload, log);
  }

  let browser;
  try {
    // ── Launch Playwright ──────────────────────────────────
    // Prefer Playwright's bundled Chromium (production). If it isn't
    // installed (e.g. no internet to download it), fall back to the
    // system-installed Edge, then Chrome.
    const launchArgs = {
      headless: HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,900',
      ],
    };
    const channelsToTry = [undefined, 'msedge', 'chrome'];
    let launchErr = null;
    for (const channel of channelsToTry) {
      try {
        browser = await chromium.launch(channel ? { ...launchArgs, channel } : launchArgs);
        console.log(`[Agent] Browser launched${channel ? ` (channel: ${channel})` : ' (bundled chromium)'}`);
        break;
      } catch (e) { launchErr = e; }
    }
    if (!browser) {
      throw new Error(`Could not launch any browser (bundled chromium, msedge, chrome). Last error: ${launchErr?.message}`);
    }

    const context = await browser.newContext({
      viewport:   { width: 1280, height: 900 },
      userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale:     'en-IN',
      timezoneId: 'Asia/Kolkata',
    });

    // Block unnecessary resources to speed up navigation
    await context.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());
    await context.route('**/analytics**', route => route.abort());
    await context.route('**/gtag**',      route => route.abort());

    const page = await context.newPage();

    // ── Navigate to CPCB SWM Portal ───────────────────────
    log('navigate', 'success', `Opening ${PORTAL_URL}`);
    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: T.NAV });
    const ss0 = await snap(page, org_id, '00_portal_home');
    log('navigate', 'success', 'Portal home loaded', ss0);

    // ── Find registration entry point ─────────────────────
    await navigateToRegistration(page, log, org_id);

    // ══════════════════════════════════════════════════════
    //  STEP 1: Account Creation
    // ══════════════════════════════════════════════════════
    await step1AccountCreation(page, payload, log, org_id, db, jobId);

    // ══════════════════════════════════════════════════════
    //  STEP 2: Organisation & Address Details
    // ══════════════════════════════════════════════════════
    await step2OrgAndAddress(page, payload, log, org_id);

    // ══════════════════════════════════════════════════════
    //  STEP 3: Verify Details (just click through)
    // ══════════════════════════════════════════════════════
    await step3VerifyDetails(page, log, org_id);

    // ══════════════════════════════════════════════════════
    //  STEP 4: Accept Terms & Conditions (3 declarations)
    // ══════════════════════════════════════════════════════
    await step4AcceptTerms(page, log, org_id);

    // ══════════════════════════════════════════════════════
    //  STEP 5: Submit & Extract ACK Number
    // ══════════════════════════════════════════════════════
    const { ackNumber, portalStatus } = await step5SubmitAndExtractAck(page, log, org_id);

    return { ackNumber, portalStatus };

  } finally {
    if (browser) await browser.close();
  }
}

// ── Screenshot helper ─────────────────────────────────────────
async function snap(page, orgId, label) {
  const filename = `${orgId.slice(0, 8)}_${label}_${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false }).catch(() => {});
  return filepath;
}

// ── Safe element fill (does nothing if element not found) ─────
async function safeFill(page, selectors, value, desc) {
  for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.clear();
        await el.fill(String(value || ''));
        console.log(`  → Filled [${desc}]: "${value}"`);
        return true;
      }
    } catch { /* noop */ }
  }
  console.log(`  ⚠ Could not fill [${desc}] — selector not found`);
  return false;
}

// ── Safe select ───────────────────────────────────────────────
async function safeSelect(page, selectors, value, desc) {
  for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        // Try by label text first, then by value
        try { await el.selectOption({ label: value }); }
        catch { await el.selectOption({ value: String(value) }); }
        console.log(`  → Selected [${desc}]: "${value}"`);
        return true;
      }
    } catch { /* noop */ }
  }
  console.log(`  ⚠ Could not select [${desc}]`);
  return false;
}

// ── Smart select (fuzzy match + dependent-dropdown aware) ─────
// Waits for options to populate (LGD dropdowns load via AJAX), then matches
// wantText exact → contains → reverse-contains; with fallbackFirst it picks the
// first real option when nothing matches (used for sub-category / sub-district /
// panchayat, whose exact CPCB label we can't always predict).
async function smartSelect(page, selectors, wantText, desc, fallbackFirst = false) {
  for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
    try {
      const el = page.locator(sel).first();
      if (!(await el.isVisible({ timeout: 1500 }))) continue;
      await page.waitForFunction(s => { const e = document.querySelector(s); return e && e.options.length > 1; }, sel, { timeout: 12000 }).catch(() => {});
      const opts = await el.evaluate(e => [...e.options].map(o => ({ v: o.value, t: (o.textContent || '').trim() })));
      const want = String(wantText || '').toLowerCase().trim();
      let m = null;
      if (want) m = opts.find(o => o.t.toLowerCase() === want)
        || opts.find(o => o.v && o.t.toLowerCase().includes(want))
        || opts.find(o => o.v && want.includes(o.t.toLowerCase()));
      if (!m && fallbackFirst) { m = opts.find(o => o.v && !/^--|select/i.test(o.t)); if (m) console.log(`  ⚠ [${desc}] no match for "${wantText}" — using first option "${m.t}"`); }
      if (!m) { console.log(`  ⚠ Could not match [${desc}] = "${wantText}"`); return false; }
      await el.selectOption({ value: m.v }).catch(async () => { await el.selectOption({ label: m.t }); });
      console.log(`  → Selected [${desc}]: "${m.t}"`);
      await page.waitForTimeout(1200);
      return true;
    } catch { /* next selector */ }
  }
  console.log(`  ⚠ [${desc}] select not found`);
  return false;
}

// ── Check a radio / custom radio ──────────────────────────────
async function clickRadio(page, selectors, desc) {
  for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.check().catch(async () => { await el.click({ force: true }); });
        console.log(`  → Selected radio [${desc}]`);
        return true;
      }
    } catch { /* next */ }
  }
  console.log(`  ⚠ Could not select radio [${desc}]`);
  return false;
}

// ── Capture the OTP-modal CAPTCHA as a data URL ───────────────
// The live CPCB captcha is NOT an <img src=captcha> — it renders distorted
// text in a styled box to the RIGHT of #otpCaptchaInput. So: try explicit
// image/canvas/svg elements first, then fall back to clipping that region.
async function captureCaptcha(page) {
  const imgSels = [
    'img[src*="captcha" i]', 'img[id*="captcha" i]', 'img[alt*="captcha" i]',
    'canvas[id*="captcha" i]', 'svg[id*="captcha" i]',
  ];
  for (const sel of imgSels) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1200 })) {
        const buf = await el.screenshot();
        return `data:image/png;base64,${buf.toString('base64')}`;
      }
    } catch { /* next */ }
  }
  // Fallback: clip the region just right of the captcha input.
  try {
    const box = await page.locator('#otpCaptchaInput, input[placeholder*="captcha" i]').first().boundingBox();
    if (box) {
      const clip = { x: Math.max(0, box.x + box.width + 4), y: Math.max(0, box.y - 16), width: 240, height: box.height + 32 };
      const buf = await page.screenshot({ clip });
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
  } catch { /* noop */ }
  return null;
}

// ── Click the OTP modal's "Verify Number" button ──────────────
async function clickVerifyNumber(page, log) {
  for (const sel of ['button:has-text("Verify Number")', 'button:has-text("Verify")']) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) { await el.click(); log('step1', 'success', `Clicked ${sel}`); return true; }
    } catch { /* next */ }
  }
  log('step1', 'error', 'Could not find "Verify Number" button');
  return false;
}

// ── Refresh the OTP-modal captcha (after a wrong attempt) ──────
async function refreshCaptcha(page) {
  for (const sel of ['#otpCaptchaInput ~ button', 'button[title*="refresh" i]', 'button:has(svg)']) {
    try { const el = page.locator(sel).first(); if (await el.isVisible({ timeout: 1000 })) { await el.click(); await page.waitForTimeout(1200); return true; } } catch { /* next */ }
  }
  return false;
}

// ── Navigate to registration form ────────────────────────────
async function navigateToRegistration(page, log, orgId) {
  log('navigate', 'success', 'Looking for registration link…');

  // Common entry point patterns on CPCB SWM portal
  const registerPatterns = [
    'a:has-text("Register as BWG")',
    'a:has-text("New Registration")',
    'a:has-text("Register")',
    'button:has-text("Register")',
    'a[href*="register"]',
    'a[href*="signup"]',
  ];

  for (const pattern of registerPatterns) {
    try {
      const el = page.locator(pattern).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        await page.waitForLoadState('domcontentloaded', { timeout: T.NAV });
        log('navigate', 'success', `Clicked: ${pattern}`);
        return;
      }
    } catch { /* try next */ }
  }

  // Fallback: direct URL
  const registrationUrls = [
    `${PORTAL_URL}/registration`,
    `${PORTAL_URL}/user/register`,
    `${PORTAL_URL}/bwg/register`,
  ];

  for (const url of registrationUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: T.LOAD });
      log('navigate', 'success', `Direct URL: ${url}`);
      const ss = await snap(page, orgId, '01_registration_page');
      log('navigate', 'success', 'Registration page loaded', ss);
      return;
    } catch { /* try next */ }
  }

  throw new Error('Could not find registration entry point on CPCB portal. The portal may have changed its URL structure.');
}

// ══════════════════════════════════════════════════════════════
//  STEP 1: Account Creation
//  Fields: org_name, auth_person, email, mobile
// ══════════════════════════════════════════════════════════════
async function step1AccountCreation(page, p, log, orgId, db = null, jobId = null) {
  log('step1', 'success', 'Filling Step 1 — Account creation');

  // Dismiss the disclaimer/notice modal if one is shown ("I Understand").
  try {
    const ok = page.locator('button:has-text("I Understand"), button:has-text("I Agree"), button:has-text("Accept")').first();
    if (await ok.isVisible({ timeout: 2500 })) { await ok.click().catch(() => {}); log('step1', 'success', 'Dismissed disclaimer modal'); }
  } catch { /* no modal */ }

  // NOTE: selectors verified against the live swm.cpcb.gov.in/register form
  // (real ids listed first, then resilient fallbacks).
  // Organisation / entity name
  await safeFill(page, [
    '#organisation_name',
    'input[placeholder*="Organisation/Entity"]', 'input[placeholder*="Organisation"]', 'input[placeholder*="Entity"]',
    'input[name*="orgName"]', 'input[id*="orgName"]', 'input[id*="organisation"]',
  ], p.org_name, 'Organisation Name');

  // Authorised person  (portal spells it "Authorized Person")
  await safeFill(page, [
    '#auth_name',
    'input[placeholder*="Authorized Person"]', 'input[placeholder*="Authorised"]',
    'input[name*="authorizedPerson"]', 'input[name*="auth_person"]', 'input[id*="auth_name"]',
  ], p.auth_person, 'Authorised Person');

  // Email
  await safeFill(page, [
    '#auth_email',
    'input[type="email"]', 'input[name*="email"]', 'input[id*="email"]', 'input[placeholder*="email"]',
  ], p.email, 'Email');

  // Mobile number (10-digit, no +91)
  await safeFill(page, [
    '#auth_mobile',
    'input[type="tel"]', 'input[id*="mobile"]', 'input[name*="mobile"]',
    'input[placeholder*="10-digit"]', 'input[maxlength="10"]',
  ], p.phone.replace(/^\+91/, '').replace(/\s/g, ''), 'Mobile');

  const ss = await snap(page, orgId, '02_step1_filled');
  log('step1', 'success', 'Step 1 fields filled', ss);

  // ── Detect whether the CPCB portal requires an OTP at this step ──
  const otpButton = page.locator('button:has-text("OTP"), a:has-text("OTP"), input[value*="OTP"]').first();
  const otpField  = page.locator('input[name*="otp"], input[id*="otp"], input[placeholder*="OTP"]').first();
  const otpButtonVisible = await otpButton.isVisible({ timeout: 3000 }).catch(() => false);
  const otpFieldVisible  = await otpField.isVisible({ timeout: 1500 }).catch(() => false);
  const otpRequired      = otpButtonVisible || otpFieldVisible;

  if (!otpRequired) {
    log('step1', 'success', 'No OTP step detected on this page — proceeding');
    await clickNextOrRegister(page, log);
    return;
  }

  // ══════════════════════════════════════════════════════════════
  //  OTP IS REQUIRED — FAIL-SAFE: never submit without a valid OTP
  // ══════════════════════════════════════════════════════════════
  log('step1', 'success', 'OTP verification required by CPCB portal');

  // If there is no channel to ask the user, we MUST NOT proceed.
  if (!db || !jobId) {
    throw new Error('OTP required but no user channel (db/jobId) is available. Halting WITHOUT submitting to the CPCB portal.');
  }

  // Trigger the OTP send (CPCB texts the OTP to the user's mobile)
  if (otpButtonVisible) {
    await otpButton.click().catch(() => {});
    log('step1', 'success', "Clicked 'Generate OTP' — CPCB is sending an OTP to the user's mobile");
    await page.waitForTimeout(1500);
  }
  db.prepare("UPDATE queue_jobs SET otp_sent_at = datetime('now') WHERE id = ?").run(jobId);

  // ── OTP entry with a 3-attempt lockout ─────────────────────────
  // Each loop: capture (refreshed) CAPTCHA → pause for the user → submit →
  // verify. A wrong OTP/CAPTCHA increments otp_attempts; 3 failures lock the
  // job and flag the org as NeedsAttention for an admin Reset & Retry.
  const MAX_OTP_ATTEMPTS = 3;
  let otpAccepted = false;

  for (let attempt = 1; attempt <= MAX_OTP_ATTEMPTS; attempt++) {
    // Capture the CAPTCHA image (it refreshes after each wrong attempt).
    // CPCB's OTP modal always shows a text CAPTCHA next to #otpCaptchaInput.
    const captchaDataUrl = await captureCaptcha(page);
    if (captchaDataUrl) log('step1', 'success', `Captured CAPTCHA image (attempt ${attempt}/${MAX_OTP_ATTEMPTS})`);
    else                log('step1', 'error', `Could not capture CAPTCHA image (attempt ${attempt}/${MAX_OTP_ATTEMPTS})`);

    // Pause the job and surface the OTP prompt to the user on the status page
    db.prepare(`
      UPDATE queue_jobs
      SET captcha_image_base64 = ?, status = 'waiting_for_user',
          otp_input = NULL, captcha_text_input = NULL
      WHERE id = ?
    `).run(captchaDataUrl, jobId);
    log('step1', 'success', `Paused — waiting for user OTP (attempt ${attempt}/${MAX_OTP_ATTEMPTS})` + (captchaDataUrl ? ' + CAPTCHA' : ''));

    // On the first pause, message the client a link to enter the OTP on their
    // own screen (we never read the OTP over a call).
    if (attempt === 1) {
      try {
        const tok = db.prepare('SELECT payment_token FROM organizations WHERE id = ?').get(orgId);
        if (tok?.payment_token) {
          db.prepare("INSERT INTO notifications (id, org_id, channel, type, status, payload) VALUES (?,?,?,?,?,?)")
            .run(randomUUID(), orgId, 'whatsapp', 'otp_link', 'queued',
                 `Action needed: enter the CPCB OTP to complete your filing → /status/${tok.payment_token}`);
          log('step1', 'success', 'Queued OTP-link notification to the client');
        }
      } catch { /* notifications insert is non-fatal */ }
    }

    // Poll for the user's input (up to ~5 minutes)
    let userOtp = null, userCaptcha = null;
    const MAX_POLLS = 150;  // 150 × 2s = 5 minutes
    for (let i = 0; i < MAX_POLLS; i++) {
      const job = db.prepare('SELECT otp_input, captcha_text_input FROM queue_jobs WHERE id = ?').get(jobId);
      if (job && job.otp_input) {
        userOtp     = job.otp_input;
        userCaptcha = job.captcha_text_input;
        break;
      }
      await page.waitForTimeout(2000);
    }

    // No OTP received → DO NOT submit. Halt so the job can retry later.
    // (A timeout is not a wrong OTP, so it does NOT consume an attempt.)
    if (!userOtp) {
      db.prepare("UPDATE queue_jobs SET status = 'pending' WHERE id = ?").run(jobId);
      throw new Error('Timed out waiting for OTP from user (5 min). Halting WITHOUT submitting to the CPCB portal.');
    }

    // Enter the OTP + CAPTCHA into the modal (real CPCB ids first)
    await safeFill(page, ['#mobileOtpInput', 'input[name*="otp"]', 'input[id*="otp" i]', 'input[placeholder*="OTP" i]'], userOtp, 'OTP');
    if (userCaptcha) {
      await safeFill(page, ['#otpCaptchaInput', 'input[name*="captcha"]', 'input[id*="captcha" i]', 'input[placeholder*="captcha" i]'], userCaptcha, 'CAPTCHA text');
    }
    db.prepare("UPDATE queue_jobs SET status = 'processing' WHERE id = ?").run(jobId);

    // Submit via the modal's "Verify Number" button (NOT the step-advance button)
    await clickVerifyNumber(page, log);

    // Accepted iff the "Verify Mobile Number" modal closes and no error text shows.
    await page.waitForTimeout(2500);
    const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');
    const modalGone = !(await page.locator('text=Verify Mobile Number').isVisible().catch(() => false));
    const rejected  = /invalid\s+otp|incorrect\s+otp|otp\s+(?:is\s+)?(?:invalid|wrong|expired)|invalid\s+captcha|wrong\s+captcha/i.test(pageText) || !modalGone;

    if (!rejected) {
      otpAccepted = true;
      log('step1', 'success', 'Mobile verified — OTP + CAPTCHA accepted');
      break;
    }

    // Rejected → record the failed attempt and refresh the captcha for the retry
    await refreshCaptcha(page);
    db.prepare("UPDATE queue_jobs SET otp_input = NULL, captcha_text_input = NULL, otp_attempts = otp_attempts + 1 WHERE id = ?").run(jobId);
    const { otp_attempts } = db.prepare("SELECT otp_attempts FROM queue_jobs WHERE id = ?").get(jobId);
    log('step1', 'error', `CPCB rejected the OTP/CAPTCHA (failed attempt ${otp_attempts}/${MAX_OTP_ATTEMPTS})`);

    if (otp_attempts >= MAX_OTP_ATTEMPTS) {
      // Lockout: stop the run and flag for an admin Reset & Retry.
      db.prepare("UPDATE queue_jobs SET status = 'failed', otp_locked_until = datetime('now','+30 minutes'), last_error = 'OTP lockout after 3 failed attempts' WHERE id = ?").run(jobId);
      db.prepare("UPDATE organizations SET status = 'NeedsAttention' WHERE id = ?").run(orgId);
      try {
        db.prepare("INSERT INTO notifications (id, org_id, channel, type, status, payload) VALUES (?,?,?,?,?,?)")
          .run(randomUUID(), orgId, 'whatsapp', 'needs_attention', 'queued',
               'We could not verify your OTP after 3 attempts. Our consultant will contact you shortly to retry.');
      } catch { /* notifications insert is non-fatal */ }
      const lockErr = new Error('OTP lockout: 3 failed attempts. Flagged NeedsAttention for admin reset.');
      lockErr.code = 'OTP_LOCKOUT';
      throw lockErr;
    }
    // else: loop continues → re-prompt the user for another attempt.
  }

  if (!otpAccepted) throw new Error('OTP not accepted.');

  // Mobile verified → the modal closed. Now click "Create Account & Proceed to
  // Step 2" (a separate button from "Verify Number") to advance the wizard.
  await clickNextOrRegister(page, log);
  const ssAcct = await snap(page, orgId, '02b_account_created');
  log('step1', 'success', 'Account created — advanced to Step 2', ssAcct);
}

// ── Click "Next" / "Save & Continue", falling back to "Register" ──
async function clickNextOrRegister(page, log) {
  const clicked = await clickNext(page, log, 'Step 1 → Step 2');
  if (!clicked) {
    try {
      const regBtn = page.locator('button:has-text("Register"), input[value="Register"]').first();
      if (await regBtn.isVisible({ timeout: 2000 })) {
        await regBtn.click();
        log('step1', 'success', 'Clicked Register button');
      }
    } catch { /* noop */ }
  }
}

// ══════════════════════════════════════════════════════════════
//  STEP 2: Organisation Details + LGD Address
//  Category, sub-category, waste metrics, full LGD address
// ══════════════════════════════════════════════════════════════
async function step2OrgAndAddress(page, p, log, orgId) {
  log('step2', 'success', 'Filling Step 2 — Organisation & address');

  // ── Part A: Category → Sub-category (dependent) ───────
  await smartSelect(page, ['#category_id', 'select[id*="category" i]', 'select[name*="category" i]'], p.category, 'Category');
  await page.waitForTimeout(900);   // sub-category options load
  // Sub-category label can't always be predicted → fuzzy match, else first option.
  await smartSelect(page, ['#sub_cat_id', 'select[id*="sub_cat" i]', 'select[name*="subCategory" i]'], p.sub_category, 'Sub-category', true);

  // Selecting a sub-category injects the dynamic waste-metric questions.
  await page.waitForTimeout(1200);

  // ── Part B: Waste metrics (dynamic question_* ids → match by placeholder) ──
  await safeFill(page, ['input[placeholder*="Floor Area" i]', 'input[name*="floorArea"]', 'input[id*="floorArea"]'], p.floor_area_sqm, 'Floor Area (sq.m)');
  await safeFill(page, ['input[placeholder*="Waste Generation" i]', 'input[placeholder*="kg/day" i]', 'input[name*="wasteGeneration"]'], p.waste_kg_per_day, 'Waste Generation (kg/day)');
  await safeFill(page, ['input[placeholder*="Water Consumption" i]', 'input[placeholder*="L/day" i]', 'input[name*="waterConsumption"]'], p.water_liters_per_day, 'Water Consumption (L/day)');

  // ── Part C: LGD Address (dependent selects) ───────────
  await smartSelect(page, ['#state_id', 'select[id*="state" i]'], p.state_name, 'State');
  await page.waitForTimeout(1200);   // districts load
  await smartSelect(page, ['#district_id', 'select[id*="district" i]'], p.district_name, 'District');
  await page.waitForTimeout(1200);   // sub-districts load
  // Sub-district exact label varies (and some districts have none) → fuzzy, else first.
  await smartSelect(page, ['#sub_district_id', 'select[id*="sub_district" i]', 'select[name*="taluka" i]'], p.sub_district, 'Sub-district / Taluka', true);

  await safeFill(page, ['#city_name', 'input[placeholder*="City" i]', 'input[name*="city"]'], p.city_name, 'City / Village');
  if (p.zone_ward) await safeFill(page, ['#zone_board', 'input[placeholder*="Zone" i]'], p.zone_ward, 'Zone / Ward');
  await safeFill(page, ['#fullAddress', 'input[placeholder*="Full Address" i]', 'textarea[name*="address"]'], p.full_address, 'Full Address');

  // Local body: ULB/RLB radio → reveals the #panchayat (local-body name) dropdown.
  const isRLB = /rlb|rural/i.test(p.local_body_type || '');
  await clickRadio(page, isRLB ? ['#area_type_rlb', 'label:has-text("Rural")'] : ['#area_type_ulb', 'label:has-text("Urban")'], `Local body ${isRLB ? 'RLB' : 'ULB'}`);
  await page.waitForTimeout(1400);
  // No column feeds the exact panchayat name → match p.local_body_name if present, else first real option.
  await smartSelect(page, ['#panchayat', 'select[id*="localBody" i]', 'select[name*="panchayat" i]'], p.local_body_name, 'Local Body (panchayat)', true);

  await safeFill(page, ['#pincode', 'input[placeholder*="Pincode" i]', 'input[name*="pincode"]'], p.pincode, 'Pincode');
  if (p.latitude)  await safeFill(page, ['#geo_lat',  'input[placeholder*="Lattitude" i]', 'input[placeholder*="Latitude" i]'], p.latitude,  'Latitude');
  if (p.longitude) await safeFill(page, ['#geo_long', 'input[placeholder*="Longitude" i]'], p.longitude, 'Longitude');

  const ss = await snap(page, orgId, '03_step2_filled');
  log('step2', 'success', 'Step 2 fields filled', ss);

  await clickNext(page, log, 'Step 2 → Step 3');
}

// ══════════════════════════════════════════════════════════════
//  STEP 3: Verify Details
//  The portal shows a read-only review screen.
//  Action: simply click "Next" / "Confirm" to proceed.
// ══════════════════════════════════════════════════════════════
async function step3VerifyDetails(page, log, orgId) {
  log('step3', 'success', 'Step 3 — Verify Details: confirming and moving to Step 4');

  const ss = await snap(page, orgId, '04_step3_verify');
  log('step3', 'success', 'Step 3 "Verify Details" screen captured', ss);

  // Just click Next/Confirm — this is a read-only review step
  const confirmed = await clickNext(page, log, 'Step 3 → Step 4');
  if (!confirmed) {
    // Also try "Confirm" / "Proceed" buttons
    const patterns = [
      'button:has-text("Confirm")',
      'button:has-text("Proceed")',
      'a:has-text("Next")',
      'input[value="Confirm"]',
    ];
    for (const p of patterns) {
      try {
        const el = page.locator(p).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.click();
          await page.waitForLoadState('domcontentloaded', { timeout: T.LOAD });
          log('step3', 'success', `Clicked: ${p}`);
          return;
        }
      } catch { /* noop */ }
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  STEP 4: Accept Terms & Conditions
//  The portal shows 3 mandatory declaration checkboxes:
//    □ 1. Legal basis under SWM Rules 2016/2026
//    □ 2. BWG obligations acknowledgement
//    □ 3. Accuracy of information certification
// ══════════════════════════════════════════════════════════════
async function step4AcceptTerms(page, log, orgId) {
  log('step4', 'success', 'Step 4 — Accept Terms & Conditions: checking 3 declarations');

  await page.waitForLoadState('domcontentloaded', { timeout: T.LOAD });

  // ── Checkbox selector patterns for the 3 declarations ─
  // The CPCB portal may use various patterns. We try multiple.
  const checkboxSelectors = [
    // By index (most reliable if there are exactly 3 checkboxes)
    'input[type="checkbox"]',
    // By name patterns
    'input[name*="declaration"]',
    'input[name*="agree"]',
    'input[name*="term"]',
    'input[name*="accept"]',
    'input[name*="check"]',
    // By ID patterns
    '#declaration1', '#declaration2', '#declaration3',
    '#agree1', '#agree2', '#agree3',
    '#term1', '#term2', '#term3',
  ];

  // First: try to get ALL checkboxes and check them all
  let checkedCount = 0;
  try {
    const allCheckboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`  Found ${allCheckboxes.length} checkboxes on Step 4`);

    for (const cb of allCheckboxes) {
      try {
        if (await cb.isVisible({ timeout: 1000 })) {
          const isChecked = await cb.isChecked();
          if (!isChecked) {
            await cb.check();
            console.log(`  ✓ Checked declaration checkbox #${checkedCount + 1}`);
          } else {
            console.log(`  ✓ Checkbox #${checkedCount + 1} was already checked`);
          }
          checkedCount++;
        }
      } catch { /* noop */ }
    }
  } catch (err) {
    log('step4', 'error', `Could not enumerate checkboxes: ${err.message}`);
  }

  // Verify we checked at least the mandatory 3
  if (checkedCount < 3) {
    log('step4', 'success', `Only ${checkedCount} checkbox(es) found/checked — portal may structure declarations differently. Continuing.`);
  } else {
    log('step4', 'success', `All ${checkedCount} declaration checkbox(es) checked ✓`);
  }

  // Also try text-based checkboxes (some portals use custom checkbox components)
  const textCheckPatterns = [
    'div[role="checkbox"][aria-checked="false"]',
    'span[role="checkbox"][aria-checked="false"]',
    'label:has(input[type="checkbox"]) input',
  ];
  for (const pattern of textCheckPatterns) {
    try {
      const els = await page.locator(pattern).all();
      for (const el of els) {
        if (await el.isVisible({ timeout: 500 })) {
          await el.click({ force: true });
        }
      }
    } catch { /* noop */ }
  }

  const ss = await snap(page, orgId, '05_step4_declarations_checked');
  log('step4', 'success', 'Declarations checked', ss);
}

// ══════════════════════════════════════════════════════════════
//  STEP 5: Final Submit + Extract ACK Number
//  Expected ACK format: SWM/BWG-I/{STATE_CODE}/{YEAR}/{XXXXXXX}
//  Expected portal status after submit: "Pending Verification at ULB"
// ══════════════════════════════════════════════════════════════
async function step5SubmitAndExtractAck(page, log, orgId) {
  log('step5', 'success', 'Step 5 — Final submit');

  // Click the final Submit button
  const submitPatterns = [
    'button:has-text("Final Submit")',
    'button:has-text("Submit Application")',
    'button[type="submit"]:has-text("Submit")',
    'input[type="submit"]',
    'button:has-text("Register")',
    'button:has-text("Submit")',
  ];

  for (const pattern of submitPatterns) {
    try {
      const el = page.locator(pattern).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        log('step5', 'success', `Clicked submit: ${pattern}`);
        break;
      }
    } catch { /* try next */ }
  }

  // Wait for portal to process (up to 20 seconds)
  await page.waitForLoadState('domcontentloaded', { timeout: T.SUBMIT });
  await page.waitForTimeout(3000);   // Additional buffer for JS rendering

  const ss = await snap(page, orgId, '06_step5_after_submit');
  log('step5', 'success', 'Submit processed — extracting ACK number', ss);

  // ── Extract ACK Number ───────────────────────────────────
  // ACK format: SWM/BWG-I/DL/2026/0000008
  const ackPatterns = [
    // Regex on full page text
    /SWM\/BWG[-–][A-Z]+\/[A-Z]{2}\/20\d{2}\/\d+/i,
    /ACK[-\s]?(?:NO|NUMBER|ID)?[\s:]+([A-Z0-9\/\-]{10,35})/i,
    /Acknowledgement\s+(?:No\.?|Number)[\s:]+([A-Z0-9\/\-]{8,35})/i,
    /Registration\s+(?:No\.?|Number)[\s:]+([A-Z0-9\/\-]{8,35})/i,
    // SWM generic fallback
    /SWM[\/\-][A-Z0-9\/\-]{5,30}/i,
  ];

  const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');

  for (const regex of ackPatterns) {
    const match = pageText.match(regex);
    if (match) {
      const ackNumber    = (match[1] || match[0]).trim();
      const portalStatus = extractPortalStatus(pageText);
      log('step5', 'success', `ACK extracted: ${ackNumber} | Status: ${portalStatus}`);
      return { ackNumber, portalStatus };
    }
  }

  // ── Try DOM element selectors ────────────────────────────
  const ackSelectors = [
    '[id*="ack"]', '[class*="ack"]',
    '[id*="registrationNo"]', '[id*="regNo"]',
    'td:has-text("SWM")', 'span:has-text("SWM")',
    '.success-message', '#ackNumber', '.ack-number',
    'p:has-text("Acknowledgement")', 'div:has-text("Acknowledgement")',
  ];

  for (const sel of ackSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        const text = await el.innerText();
        // Extract ACK-like string from element text
        const match = text.match(/SWM[\/\-][A-Z0-9\/\-]{5,30}/i)
          || text.match(/[A-Z]{3}\/[A-Z]{3}[-–][A-Z]+\/[A-Z]{2}\/20\d{2}\/\d+/i);
        if (match) {
          const ackNumber    = match[0].trim();
          const portalStatus = extractPortalStatus(pageText);
          log('step5', 'success', `ACK from element ${sel}: ${ackNumber}`);
          return { ackNumber, portalStatus };
        }
      }
    } catch { /* try next */ }
  }

  // ── Read-only field fallback ──────────────────────────────
  try {
    const readonlyFields = await page.locator('input[readonly]').all();
    for (const field of readonlyFields) {
      const val = await field.inputValue().catch(() => '');
      if (val.includes('SWM') || val.includes('/BWG')) {
        const portalStatus = extractPortalStatus(pageText);
        log('step5', 'success', `ACK from readonly input: ${val}`);
        return { ackNumber: val.trim(), portalStatus };
      }
    }
  } catch { /* noop */ }

  throw new Error('ACK number not found on submission page. The portal response structure may have changed.');
}

// ── Extract portal status text ────────────────────────────────
function extractPortalStatus(pageText) {
  // Common CPCB portal status strings
  const statusPatterns = [
    /Pending Verification at ULB/i,
    /Pending at ULB/i,
    /ULB Verification Pending/i,
    /Application Submitted/i,
    /Registration Successful/i,
    /Status:\s+([^\n.]+)/i,
  ];

  for (const p of statusPatterns) {
    const m = pageText.match(p);
    if (m) return (m[1] || m[0]).trim();
  }
  return 'Pending Verification at ULB';  // Default expected status
}

// ── Click Next / Save & Continue ─────────────────────────────
async function clickNext(page, log, context) {
  const patterns = [
    // real CPCB step-advance buttons (verified on the live portal)
    'button:has-text("Create Account & Proceed")',
    'button:has-text("Proceed to Step")',
    'button:has-text("Proceed")',
    'button:has-text("Next")',
    'button:has-text("Save & Next")',
    'button:has-text("Save & Continue")',
    'button:has-text("Continue")',
    'a:has-text("Next")',
    'input[type="button"][value="Next"]',
    'input[type="submit"][value="Next"]',
    'button[type="submit"]:not(:has-text("Submit"))',
  ];

  for (const pattern of patterns) {
    try {
      const el = page.locator(pattern).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        await page.waitForLoadState('domcontentloaded', { timeout: T.LOAD });
        log('navigate', 'success', `${context}: clicked "${pattern}"`);
        return true;
      }
    } catch { /* try next */ }
  }

  log('navigate', 'success', `${context}: no Next button found — portal may use auto-advance`);
  return false;
}

// ── Demo mode (no real portal) ────────────────────────────────
async function runDemoMode(payload, log) {
  log('demo', 'success', '🎭 DEMO MODE — Simulating 5-step CPCB filing (no real portal)');

  const steps = [
    { delay: 800,  step: 'step1', msg: `Demo: Step 1 — Account details entered (${payload.org_name})` },
    { delay: 1200, step: 'step2', msg: `Demo: Step 2 — Category "${payload.category}", address "${payload.city_name}"` },
    { delay: 600,  step: 'step3', msg: 'Demo: Step 3 — Verify details bypassed (clicked Next)' },
    { delay: 1000, step: 'step4', msg: 'Demo: Step 4 — All 3 declaration checkboxes checked ✓' },
    { delay: 1500, step: 'step5', msg: 'Demo: Step 5 — Form submitted' },
  ];

  for (const s of steps) {
    await new Promise(r => setTimeout(r, s.delay));
    log(s.step, 'success', s.msg);
  }

  // Generate a realistic-looking demo ACK
  const stateCode = payload.state_name?.slice(0, 2).toUpperCase() || 'GJ';
  const serial    = String(Math.floor(Math.random() * 9999)).padStart(7, '0');
  const ackNumber = `SWM/BWG-I/${stateCode}/2026/${serial}`;

  log('step5', 'success', `Demo ACK generated: ${ackNumber}`);

  return {
    ackNumber,
    portalStatus: 'Pending Verification at ULB',
  };
}
