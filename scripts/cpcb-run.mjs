/**
 * CPCB continuous filing driver — runs Steps 1→5 in ONE browser session that
 * never closes (the form is a single-page React flow with no server-side draft).
 * Human-in-the-loop via files under .cpcb/:
 *   entity.json  — Step 1 identity        step2.json — Step 2 category+address
 *   otp.txt      — SMS OTP (user)         captcha.txt — captcha solve (operator)
 *   go2/go3/go4.txt — review gates: the operator inspects the screenshot, then
 *                     creates the file to let the run proceed past that step.
 * Screens land in .cpcb/shots, field dumps in .cpcb/*-fields.txt.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DIR = '.cpcb';
const SHOTS = path.join(DIR, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const URL = (process.env.CPCB_PORTAL_URL || 'https://swm.cpcb.gov.in') + '/register';
const entity = JSON.parse(fs.readFileSync(path.join(DIR, 'entity.json'), 'utf8'));
const step2 = JSON.parse(fs.readFileSync(path.join(DIR, 'step2.json'), 'utf8'));
for (const f of ['otp.txt', 'captcha.txt', 'go2.txt', 'go3.txt', 'go4.txt']) { try { fs.rmSync(path.join(DIR, f), { force: true }); } catch {} }

const P = (n) => path.join(DIR, n);
const shot = async (page, name, opts = { fullPage: true }) => { await page.screenshot({ path: path.join(SHOTS, name + '.png'), ...opts }).catch(() => {}); console.log('📸', name); };
async function dump(page, name) {
  const rows = await page.evaluate(() => { const c = (s, n = 60) => (s || '').toString().trim().replace(/\s+/g, ' ').slice(0, n); return [...document.querySelectorAll('input,select,textarea,button')].filter(e => e.offsetParent !== null).map(e => ({ tag: e.tagName.toLowerCase(), type: e.getAttribute('type') || '', id: e.id || '', ph: e.getAttribute('placeholder') || '', text: c(e.innerText || e.value || '', 44), opts: e.tagName === 'SELECT' ? [...e.options].slice(0, 16).map(o => c(o.text, 26)) : null })); });
  const t = rows.map(f => `  <${f.tag} type=${f.type}> id="${f.id}" ph="${f.ph}" text="${f.text}"` + (f.opts ? ` options=${JSON.stringify(f.opts)}` : '')).join('\n');
  fs.writeFileSync(P(name + '.txt'), t); console.log(`\n[${name}]\n${t}\n`);
}
const waitFile = async (f, ms = 600000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (fs.existsSync(f)) { const v = fs.readFileSync(f, 'utf8').trim(); if (v) return v; } } catch {} await new Promise(r => setTimeout(r, 2500)); } return null; };
async function fill(page, sel, val, label) { try { const el = page.locator(sel).first(); await el.fill(''); await el.fill(String(val)); console.log('  ✓', label, '=', val); return true; } catch (e) { console.log('  ✗', label, e.message.split('\n')[0]); return false; } }
async function click(page, sels, label) { for (const s of sels) { try { const el = page.locator(s).first(); if (await el.isVisible({ timeout: 1200 })) { await el.click(); console.log('  ✓ clicked', label, `(${s})`); return true; } } catch {} } console.log('  ✗ click', label); return false; }
async function fillQuestions(page) {
  // Dynamic waste-metric questions injected after sub-category (Floor Area / Waste Generation / Water Consumption, etc.)
  const inputs = page.locator('input[type="number"]');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) {
    const el = inputs.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    if (await el.inputValue().catch(() => '')) continue;
    const ph = ((await el.getAttribute('placeholder').catch(() => '')) || '').toLowerCase();
    let v = 100;
    if (/floor|area/.test(ph)) v = 5000;
    else if (/waste/.test(ph)) v = 150;
    else if (/water/.test(ph)) v = 5000;
    await el.fill(String(v)).catch(() => {});
    console.log('  ✓ question', ph || '(number)', '=', v);
  }
}
async function selectDep(page, sel, wantText, label, fallbackFirst = false) {
  await page.waitForFunction(s => { const e = document.querySelector(s); return e && e.options.length > 1; }, sel, { timeout: 15000 }).catch(() => {});
  const opts = await page.$$eval(sel + ' option', os => os.map(o => ({ v: o.value, t: o.textContent.trim() })));
  console.log(`  ${label} options:`, JSON.stringify(opts.map(o => o.t)));
  const want = String(wantText || '').toLowerCase().trim();
  let m = opts.find(o => o.t.toLowerCase() === want) || opts.find(o => o.v && o.t.toLowerCase().includes(want)) || opts.find(o => o.v && want.includes(o.t.toLowerCase()));
  if (!m && fallbackFirst) { m = opts.find(o => o.v && !/^--|select/i.test(o.t)); if (m) console.log('  ⚠ no text match; falling back to first option'); }
  if (!m) { console.log('  ✗ NO MATCH', label, '=', wantText); return false; }
  await page.selectOption(sel, { value: m.v }).catch(async () => { await page.selectOption(sel, { label: m.t }); });
  console.log('  ✓', label, '=', m.t); await page.waitForTimeout(1400); return true;
}
async function captchaShot(page, tag) { await shot(page, `cap-${tag}-full`); try { const b = await page.locator('#otpCaptchaInput').boundingBox(); if (b) await shot(page, `cap-${tag}`, { clip: { x: Math.max(0, b.x + b.width + 4), y: Math.max(0, b.y - 18), width: 250, height: b.height + 36 } }); } catch {} }
async function gate(page, name, shotName) { await shot(page, shotName); await dump(page, shotName + '-fields'); const f = P(name + '.txt'); try { fs.rmSync(f, { force: true }); } catch {} console.log(`\n=== GATE ${name} :: inspect ${shotName}.png, then write .cpcb/${name}.txt to proceed ===`); const v = await waitFile(f); console.log(v ? `→ ${name} released: ${v}` : `⚠️ ${name} timed out`); return v; }

async function launch() { for (const opt of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) { try { return await chromium.launchPersistentContext(path.join(DIR, 'session'), { headless: true, viewport: { width: 1366, height: 1000 }, ...opt }); } catch {} } throw new Error('no browser'); }

const ctx = await launch();
const page = ctx.pages()[0] || await ctx.newPage();
console.log('→ opening', URL);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);

// ---------- STEP 1 ----------
console.log('\n===== STEP 1: Account Creation =====');
await fill(page, '#organisation_name', entity.org_name, 'org');
await fill(page, '#auth_name', entity.auth_person, 'auth');
await fill(page, '#auth_email', entity.email, 'email');
await fill(page, '#auth_mobile', String(entity.mobile).replace(/\D/g, '').slice(-10), 'mobile');
await shot(page, 'r01-step1');
await click(page, ['button:has-text("Send OTP")'], 'Send OTP');
await page.waitForTimeout(3500);
console.log('=== OTP SENT — check the phone ===');
let verified = false, otp = null;
for (let a = 1; a <= 4 && !verified; a++) {
  try { fs.rmSync(P('captcha.txt'), { force: true }); } catch {}
  await captchaShot(page, a);
  console.log(`=== CAPTCHA_READY ${a} :: read .cpcb/shots/cap-${a}.png -> write .cpcb/captcha.txt ===`);
  if (a === 1) { console.log('⏳ waiting for OTP …'); otp = await waitFile(P('otp.txt')); if (!otp) { console.log('❌ no OTP'); break; } otp = otp.replace(/\D/g, ''); console.log('→ OTP:', otp); }
  console.log('⏳ waiting for captcha …'); const cap = await waitFile(P('captcha.txt'), 180000); if (!cap) { console.log('❌ no captcha'); break; }
  await fill(page, '#mobileOtpInput', otp, 'OTP'); await fill(page, '#otpCaptchaInput', cap.replace(/\s+/g, ''), 'captcha');
  await click(page, ['button:has-text("Verify Number")'], 'Verify Number'); await page.waitForTimeout(3500);
  const modalGone = !(await page.locator('text=Verify Mobile Number').isVisible().catch(() => false));
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  if (/invalid otp|otp.*(incorrect|wrong|expired)/i.test(body)) { console.log('❌ OTP rejected'); break; }
  if (modalGone && !/invalid captcha/i.test(body)) { verified = true; console.log('✅ verified'); break; }
  console.log('↻ captcha retry'); await click(page, ['#otpCaptchaInput ~ button', 'button:has(svg)'], 'refresh'); await page.waitForTimeout(1500);
}
if (!verified) { await shot(page, 'r99-step1-stuck'); console.log('⛔ stopping — Step 1 not verified'); await ctx.close(); process.exit(1); }
await click(page, ['button:has-text("Create Account & Proceed")', 'button:has-text("Proceed to Step")', 'button:has-text("Proceed")'], 'Create Account & Proceed');
await page.waitForTimeout(4000);

// If the account already exists, the portal may show a notice instead of Step 2.
let atStep2 = await page.locator('#category_id').isVisible().catch(() => false);
if (!atStep2) { await shot(page, 'r02-after-create'); await dump(page, 'r02-after-create-fields'); const g = await gate(page, 'go-acct', 'r02-account-notice'); if (g && /stop/i.test(g)) { await ctx.close(); process.exit(1); } atStep2 = await page.locator('#category_id').isVisible().catch(() => false); }
if (!atStep2) { console.log('⛔ not at Step 2 after account creation — see r02 shots'); await ctx.close(); process.exit(1); }

// ---------- STEP 2 ----------
console.log('\n===== STEP 2: Application (category + LGD address) =====');
await selectDep(page, '#category_id', step2.category, 'category');
await selectDep(page, '#sub_cat_id', step2.sub_category, 'sub category', true);
await page.waitForTimeout(1200);
await fillQuestions(page);
await selectDep(page, '#state_id', step2.state, 'state');
await selectDep(page, '#district_id', step2.district, 'district');
await selectDep(page, '#sub_district_id', step2.sub_district, 'sub district', true);
await fill(page, '#city_name', step2.city, 'city');
if (step2.zone) await fill(page, '#zone_board', step2.zone, 'zone');
if (step2.block) await fill(page, '#block_ward', step2.block, 'block');
await fill(page, '#fullAddress', step2.full_address, 'full address');
await click(page, [step2.local_body === 'RLB' ? '#area_type_rlb' : '#area_type_ulb', `label:has-text("${step2.local_body === 'RLB' ? 'Rural' : 'Urban'}")`], 'local body ' + step2.local_body);
await page.waitForTimeout(1600);
await selectDep(page, '#panchayat', step2.panchayat, 'local body dropdown', true);
await fill(page, '#pincode', step2.pincode, 'pincode');
await fill(page, '#geo_lat', step2.lat, 'latitude');
await fill(page, '#geo_long', step2.long, 'longitude');
const g2 = await gate(page, 'go2', 'r03-step2-filled');
if (!g2 || !/^(go|proceed|yes)/i.test(g2)) { console.log('⛔ go2 not explicitly approved (fail-closed) — halting, nothing submitted'); await ctx.close(); process.exit(0); }
await click(page, ['button:has-text("Proceed for Next Step")', 'button:has-text("Proceed")'], 'Proceed (→ Step 3)');
await page.waitForTimeout(4000);

// ---------- STEP 3: Verify Details ----------
console.log('\n===== STEP 3: Verify Details =====');
const g3 = await gate(page, 'go3', 'r04-step3-verify');
if (!g3 || !/^(go|proceed|yes)/i.test(g3)) { console.log('⛔ go3 not explicitly approved (fail-closed) — halting, nothing submitted'); await ctx.close(); process.exit(0); }
await click(page, ['button:has-text("Proceed")', 'button:has-text("Confirm")', 'button:has-text("Next")'], 'Proceed (→ Step 4)');
await page.waitForTimeout(3500);

// ---------- STEP 4: Accept Terms ----------
console.log('\n===== STEP 4: Accept Terms & Conditions =====');
try { const boxes = page.locator('input[type=checkbox]'); const n = await boxes.count(); for (let i = 0; i < n; i++) { const b = boxes.nth(i); if (await b.isVisible().catch(() => false) && !(await b.isChecked().catch(() => false))) { await b.check().catch(async () => { await b.click().catch(() => {}); }); console.log('  ✓ checked terms box', i); } } } catch (e) { console.log('  terms check:', e.message.split('\n')[0]); }
const g4 = await gate(page, 'go4', 'r05-step4-terms');   // <-- final review before irreversible submit
// FAIL-CLOSED: only submit on an explicit affirmative token. Timeout (null) or anything else => abort, never submit.
if (!g4 || !/^(submit|go|yes|confirm)/i.test(g4)) { console.log('⛔ final submit NOT explicitly approved (fail-closed) — halting without submitting'); await ctx.close(); process.exit(0); }
await click(page, ['button:has-text("Submit Application")', 'button:has-text("Submit")', 'button:has-text("Accept & Submit")', 'button:has-text("Agree")'], 'FINAL SUBMIT (→ Step 5)');
await page.waitForTimeout(5000);

// ---------- STEP 5: Acknowledgement ----------
console.log('\n===== STEP 5: Acknowledgement =====');
await shot(page, 'r06-step5-ack');
await dump(page, 'r06-step5-fields');
const body = (await page.locator('body').innerText().catch(() => '')) || '';
const ack = (body.match(/(acknowledg\w*\s*(no|number|id)[:\s#]*)([A-Z0-9\-\/]{6,})/i) || [])[3] || (body.match(/\b([A-Z]{2,}[\/-]?\d{4,}[A-Z0-9\/-]*)\b/) || [])[1] || '';
fs.writeFileSync(P('ACK.txt'), 'ACK: ' + ack + '\n\n' + body.slice(0, 2000));
console.log('\n🎉 DONE. ACK candidate:', ack || '(see r06-step5-ack.png / ACK.txt)');
await ctx.close();
