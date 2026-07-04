/**
 * CPCB portal RECON — opens a visible browser at swm.cpcb.gov.in so you can walk
 * the real 5-step form manually. At each step, press ENTER in this terminal and
 * it captures every field (name/id/placeholder/label) + a screenshot. Paste the
 * resulting cpcb-recon.txt is used to calibrate the filing agent.
 *
 * Run (in YOUR terminal, needs internet + Edge/Chrome):
 *   node scripts/cpcb-recon.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import readline from 'readline';

const URL = process.env.CPCB_PORTAL_URL || 'https://swm.cpcb.gov.in';
const OUT = 'cpcb-recon.txt';

async function launch() {
  for (const opt of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
    try { return await chromium.launch({ headless: false, ...opt }); }
    catch (e) { /* try next */ }
  }
  throw new Error('Could not launch a browser. Run once:  npx playwright install chromium');
}

async function dump(page, label) {
  let data;
  try {
    data = await page.evaluate(() => {
      const clip = (s, n = 45) => (s || '').toString().trim().replace(/\s+/g, ' ').slice(0, n);
      const rows = [];
      document.querySelectorAll('input,select,textarea,button,[role="button"]').forEach(el => {
        const lbl = (el.labels && el.labels[0] && el.labels[0].innerText) || el.getAttribute('aria-label') || '';
        rows.push({
          tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '',
          name: el.getAttribute('name') || '', id: el.id || '',
          ph: el.getAttribute('placeholder') || '', label: clip(lbl),
          text: clip(el.innerText || el.value || ''),
          opts: el.tagName === 'SELECT' ? [...el.options].slice(0, 8).map(o => clip(o.text, 20)) : null,
        });
      });
      return { url: location.href, title: document.title, rows };
    });
  } catch (e) { console.log('  (could not read page:', e.message, ')'); return; }

  const lines = data.rows.map(f =>
    `  <${f.tag}${f.type ? ' type=' + f.type : ''}> name="${f.name}" id="${f.id}" ph="${f.ph}" label="${f.label}" text="${f.text}"` +
    (f.opts ? ` options=${JSON.stringify(f.opts)}` : ''));
  const block = `\n===== ${label} =====\nURL:   ${data.url}\nTITLE: ${data.title}\nFIELDS (${data.rows.length}):\n${lines.join('\n')}\n`;
  fs.appendFileSync(OUT, block);
  try { await page.screenshot({ path: `cpcb-${label}.png`, fullPage: true }); } catch {}
  console.log(block);
  console.log(`📸 saved cpcb-${label}.png  ·  appended to ${OUT}`);
}

const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
fs.writeFileSync(OUT, `CPCB recon — ${new Date().toISOString()}\nPortal: ${URL}\n`);
try { await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
catch (e) { console.log('⚠ navigation issue:', e.message, '(the browser is still open — navigate manually)'); }

console.log('\n────────────────────────────────────────────────────');
console.log(`A browser opened at ${URL}.`);
console.log('1) Navigate to each step of the registration form manually.');
console.log('2) At each page, come back here and press ENTER to capture it.');
console.log('3) Enter the OTP on the real page yourself when asked.');
console.log('4) When done, press Ctrl+C and send me cpcb-recon.txt.');
console.log('────────────────────────────────────────────────────\n');

let n = 1;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', async () => { await dump(page, `step${n}`); n++; console.log('\n(navigate to the next page, then ENTER — Ctrl+C to finish)\n'); });
