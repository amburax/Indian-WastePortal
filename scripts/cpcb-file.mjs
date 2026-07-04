/**
 * CPCB live filing driver — Step 1 (Account Creation) incl. OTP + captcha.
 * The operator solves the captcha (reads .cpcb/shots/captcha-*.png -> writes .cpcb/captcha.txt);
 * the user relays the SMS OTP (-> .cpcb/otp.txt). Session persists in .cpcb/session.
 * Entity from .cpcb/entity.json { org_name, auth_person, email, mobile }.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DIR = '.cpcb';
const URL = (process.env.CPCB_PORTAL_URL || 'https://swm.cpcb.gov.in') + '/register';
const entity = JSON.parse(fs.readFileSync(path.join(DIR, 'entity.json'), 'utf8'));
const SHOTS = path.join(DIR, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const otpFile = path.join(DIR, 'otp.txt');
const capFile = path.join(DIR, 'captcha.txt');
for (const f of [otpFile, capFile]) { try { fs.rmSync(f, { force: true }); } catch {} }

const shot = async (page, name, opts = {}) => { await page.screenshot({ path: path.join(SHOTS, name + '.png'), ...opts }).catch(() => {}); console.log('📸', name); };
async function dump(page, name) {
  const rows = await page.evaluate(() => {
    const c = (s, n = 60) => (s || '').toString().trim().replace(/\s+/g, ' ').slice(0, n);
    return [...document.querySelectorAll('input,select,textarea,button')]
      .filter(e => e.offsetParent !== null || e.type === 'hidden')
      .map(e => ({ tag: e.tagName.toLowerCase(), type: e.getAttribute('type') || '', id: e.id || '', name: e.getAttribute('name') || '', ph: e.getAttribute('placeholder') || '', text: c(e.innerText || e.value || '', 40), opts: e.tagName === 'SELECT' ? [...e.options].slice(0, 14).map(o => c(o.text, 24)) : null }));
  });
  const t = rows.map(f => `  <${f.tag} type=${f.type}> id="${f.id}" name="${f.name}" ph="${f.ph}" text="${f.text}"` + (f.opts ? ` options=${JSON.stringify(f.opts)}` : '')).join('\n');
  fs.writeFileSync(path.join(DIR, name + '.txt'), t);
  console.log(`\n[${name}]\n${t}\n`);
}
async function fill(page, sels, val, label) {
  for (const s of sels) { try { const el = page.locator(s).first(); if (await el.isVisible({ timeout: 1200 })) { await el.fill(''); await el.fill(String(val)); console.log('  ✓ filled', label); return true; } } catch {} }
  console.log('  ✗ MISS', label); return false;
}
async function click(page, sels, label) {
  for (const s of sels) { try { const el = page.locator(s).first(); if (await el.isVisible({ timeout: 1200 })) { await el.click(); console.log('  ✓ clicked', label, `(${s})`); return true; } } catch {} }
  console.log('  ✗ could not click', label); return false;
}
const waitFile = async (f, ms = 480000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (fs.existsSync(f)) { const v = fs.readFileSync(f, 'utf8').trim(); if (v) return v; } } catch {} await new Promise(r => setTimeout(r, 2500)); } return null; };

async function captchaShot(page, tag) {
  // full modal for context + a tight crop of the captcha box (right of the captcha input)
  await shot(page, `captcha-${tag}-full`);
  try {
    const b = await page.locator('#otpCaptchaInput').boundingBox();
    if (b) {
      const clip = { x: Math.max(0, b.x + b.width + 4), y: Math.max(0, b.y - 18), width: 250, height: b.height + 36 };
      await shot(page, `captcha-${tag}`, { clip });
    }
  } catch {}
}

async function launch() {
  for (const opt of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
    try { return await chromium.launchPersistentContext(path.join(DIR, 'session'), { headless: true, viewport: { width: 1366, height: 1000 }, ...opt }); } catch {}
  }
  throw new Error('no browser');
}

const ctx = await launch();
const page = ctx.pages()[0] || await ctx.newPage();
console.log('→ opening', URL);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await click(page, ['button:has-text("I Understand")', 'button:has-text("I Agree")', 'button:has-text("Accept")'], 'disclaimer');

console.log('→ filling Step 1');
await fill(page, ['#organisation_name'], entity.org_name, 'org name');
await fill(page, ['#auth_name'], entity.auth_person, 'auth person');
await fill(page, ['#auth_email'], entity.email, 'email');
await fill(page, ['#auth_mobile'], String(entity.mobile).replace(/\D/g, '').slice(-10), 'mobile');
await shot(page, '01-step1-filled');

await click(page, ['button:has-text("Send OTP")'], 'Send OTP');
await page.waitForTimeout(3500);
console.log('=== OTP SENT — SMS should reach the phone now ===');

// Get the OTP once (persists across captcha retries); solve captcha each attempt.
let verified = false;
for (let attempt = 1; attempt <= 4 && !verified; attempt++) {
  try { fs.rmSync(capFile, { force: true }); } catch {}
  await captchaShot(page, attempt);
  console.log(`=== CAPTCHA_READY attempt ${attempt} :: read .cpcb/shots/captcha-${attempt}.png -> write .cpcb/captcha.txt ===`);

  if (attempt === 1) {
    console.log('⏳ waiting for OTP (.cpcb/otp.txt) …');
    const otp = await waitFile(otpFile);
    if (!otp) { console.log('❌ no OTP (timeout)'); break; }
    global.__otp = otp.replace(/\D/g, '');
    console.log('→ OTP received:', global.__otp);
  }
  console.log('⏳ waiting for captcha solve (.cpcb/captcha.txt) …');
  const cap = await waitFile(capFile, 180000);
  if (!cap) { console.log('❌ no captcha solve (timeout)'); break; }
  const capVal = cap.replace(/\s+/g, '');
  console.log(`→ captcha solve #${attempt}:`, capVal);

  await fill(page, ['#mobileOtpInput'], global.__otp, 'OTP');
  await fill(page, ['#otpCaptchaInput'], capVal, 'captcha');
  await shot(page, `03-verify-attempt-${attempt}`);
  await click(page, ['button:has-text("Verify Number")'], 'Verify Number');
  await page.waitForTimeout(3500);
  await shot(page, `04-after-verify-${attempt}`);

  const modalGone = !(await page.locator('text=Verify Mobile Number').isVisible().catch(() => false));
  const bodyTxt = (await page.locator('body').innerText().catch(() => '')) || '';
  const capErr = /invalid captcha|captcha.*(incorrect|wrong|not match)/i.test(bodyTxt);
  const otpErr = /invalid otp|otp.*(incorrect|wrong|expired)/i.test(bodyTxt);
  console.log(`   modalGone=${modalGone} capErr=${capErr} otpErr=${otpErr}`);
  if (otpErr) { console.log('❌ OTP rejected — need a fresh OTP. Stopping.'); break; }
  if (modalGone && !capErr) { verified = true; console.log('✅ mobile verified'); break; }
  // captcha wrong → refresh and retry
  console.log('↻ refreshing captcha for retry');
  await click(page, ['#otpCaptchaInput ~ button', 'button[title*="refresh" i]', 'button:has(svg)'], 'captcha refresh');
  await page.waitForTimeout(1500);
}

if (verified) {
  await click(page, ['button:has-text("Create Account & Proceed")', 'button:has-text("Proceed to Step")', 'button:has-text("Proceed")'], 'Create Account & Proceed');
  await page.waitForTimeout(5000);
  await shot(page, '05-step2', { fullPage: true });
  await dump(page, '05-step2-fields');
  console.log('\n✅ STEP 1 COMPLETE — account created. Step-2 fields dumped to .cpcb/05-step2-fields.txt');
} else {
  await shot(page, '99-stuck', { fullPage: true });
  console.log('\n⚠️ Did not verify. See .cpcb/shots/99-stuck.png');
}
await ctx.close();
