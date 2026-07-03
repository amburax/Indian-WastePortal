/**
 * CPCB Step 2 (Application) — resumes the saved session (.cpcb/session) and,
 * when FILL=1 + .cpcb/step2.json present, fills the category + LGD address and
 * proceeds to Step 3. Run recon-only first: `node scripts/cpcb-step2.mjs`.
 * Fill: `FILL=1 node scripts/cpcb-step2.mjs`  (bash: FILL=1 ...)
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DIR = '.cpcb';
const SHOTS = path.join(DIR, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const URL = (process.env.CPCB_PORTAL_URL || 'https://swm.cpcb.gov.in') + '/register';
const FILL = process.env.FILL === '1';

const shot = async (page, name, opts = { fullPage: true }) => { await page.screenshot({ path: path.join(SHOTS, name + '.png'), ...opts }).catch(() => {}); console.log('📸', name); };
async function dump(page, name) {
  const rows = await page.evaluate(() => {
    const c = (s, n = 60) => (s || '').toString().trim().replace(/\s+/g, ' ').slice(0, n);
    return [...document.querySelectorAll('input,select,textarea,button')].filter(e => e.offsetParent !== null).map(e => ({ tag: e.tagName.toLowerCase(), type: e.getAttribute('type') || '', id: e.id || '', ph: e.getAttribute('placeholder') || '', text: c(e.innerText || e.value || '', 40), opts: e.tagName === 'SELECT' ? [...e.options].slice(0, 16).map(o => c(o.text, 26)) : null }));
  });
  const t = rows.map(f => `  <${f.tag} type=${f.type}> id="${f.id}" ph="${f.ph}" text="${f.text}"` + (f.opts ? ` options=${JSON.stringify(f.opts)}` : '')).join('\n');
  fs.writeFileSync(path.join(DIR, name + '.txt'), t);
  console.log(`\n[${name}]\n${t}\n`);
}
async function fill(page, sel, val, label) { try { const el = page.locator(sel).first(); await el.fill(''); await el.fill(String(val)); console.log('  ✓ filled', label, '=', val); return true; } catch (e) { console.log('  ✗ fill', label, e.message.split('\n')[0]); return false; } }
async function click(page, sels, label) { for (const s of sels) { try { const el = page.locator(s).first(); if (await el.isVisible({ timeout: 1200 })) { await el.click(); console.log('  ✓ clicked', label, `(${s})`); return true; } } catch {} } console.log('  ✗ click', label); return false; }
async function selectDep(page, sel, wantText, label) {
  await page.waitForFunction(s => { const e = document.querySelector(s); return e && e.options.length > 1; }, sel, { timeout: 9000 }).catch(() => {});
  const opts = await page.$$eval(sel + ' option', os => os.map(o => ({ v: o.value, t: o.textContent.trim() })));
  console.log(`  ${label} options:`, JSON.stringify(opts.map(o => o.t)));
  const want = String(wantText || '').toLowerCase().trim();
  const m = opts.find(o => o.t.toLowerCase() === want) || opts.find(o => o.v && o.t.toLowerCase().includes(want)) || opts.find(o => o.v && want.includes(o.t.toLowerCase()));
  if (!m) { console.log('  ✗ no match for', label, '=', wantText); return false; }
  await page.selectOption(sel, { value: m.v }).catch(async () => { await page.selectOption(sel, { label: m.t }); });
  console.log('  ✓ selected', label, '=', m.t);
  await page.waitForTimeout(1400);
  return true;
}

async function launch() { for (const opt of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) { try { return await chromium.launchPersistentContext(path.join(DIR, 'session'), { headless: true, viewport: { width: 1366, height: 1000 }, ...opt }); } catch {} } throw new Error('no browser'); }

const ctx = await launch();
const page = ctx.pages()[0] || await ctx.newPage();
console.log('→ opening', URL);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3500);
await shot(page, 'resume-check');
const badge = await page.locator('text=/Step \\d of 5/').first().innerText().catch(() => '?');
const atStep2 = await page.locator('#category_id').isVisible().catch(() => false);
const atStep1 = await page.locator('#organisation_name').isVisible().catch(() => false);
console.log(`→ badge="${badge}" atStep2=${atStep2} atStep1=${atStep1}`);

if (!FILL) {
  await dump(page, 'resume-fields');
  console.log(atStep2 ? '\n✅ RESUMED AT STEP 2 — ready to fill.' : atStep1 ? '\n↩ back at Step 1 (session did not carry the draft).' : '\n❓ unexpected page — see resume-check.png');
  await ctx.close();
  process.exit(0);
}

if (!atStep2) { console.log('❌ not at Step 2 — aborting fill. See resume-check.png'); await ctx.close(); process.exit(1); }
const data = JSON.parse(fs.readFileSync(path.join(DIR, 'step2.json'), 'utf8'));
console.log('→ filling Step 2 for', data.category, '/', data.state);
await selectDep(page, '#category_id', data.category, 'category');
await selectDep(page, '#sub_cat_id', data.sub_category, 'sub category');
await selectDep(page, '#state_id', data.state, 'state');
await selectDep(page, '#district_id', data.district, 'district');
await selectDep(page, '#sub_district_id', data.sub_district, 'sub district');
await fill(page, '#city_name', data.city, 'city');
if (data.zone) await fill(page, '#zone_board', data.zone, 'zone');
if (data.block) await fill(page, '#block_ward', data.block, 'block');
await fill(page, '#fullAddress', data.full_address, 'full address');
await click(page, [data.local_body === 'RLB' ? '#area_type_rlb' : '#area_type_ulb', `label:has-text("${data.local_body === 'RLB' ? 'Rural' : 'Urban'}")`], 'local body ' + data.local_body);
await fill(page, '#pincode', data.pincode, 'pincode');
await fill(page, '#geo_lat', data.lat, 'latitude');
await fill(page, '#geo_long', data.long, 'longitude');
await shot(page, '06-step2-filled');
await click(page, ['button:has-text("Proceed for Next Step")', 'button:has-text("Proceed")'], 'Proceed for Next Step');
await page.waitForTimeout(4000);
await shot(page, '07-step3');
await dump(page, '07-step3-fields');
console.log('\n✅ Step 2 submitted (or attempted). See .cpcb/shots/07-step3.png + 07-step3-fields.txt');
await ctx.close();
