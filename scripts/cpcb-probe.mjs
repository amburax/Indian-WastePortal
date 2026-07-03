/** Headless recon of the CPCB portal landing page — screenshot + link/field dump. */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || process.env.CPCB_PORTAL_URL || 'https://swm.cpcb.gov.in';
const LABEL = process.argv[3] || 'landing';

async function launch() {
  for (const opt of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
    try { const b = await chromium.launch({ headless: true, ...opt }); console.log('launched with', JSON.stringify(opt) || 'bundled chromium'); return b; }
    catch (e) { console.log('  launch failed', JSON.stringify(opt), '-', e.message.split('\n')[0]); }
  }
  throw new Error('no browser');
}

const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 1366, height: 1000 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' })).newPage();
try { await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(3500); }
catch (e) { console.log('nav:', e.message.split('\n')[0]); }

await page.screenshot({ path: `cpcb-${LABEL}.png`, fullPage: true }).catch(e => console.log('shot err', e.message));

const info = await page.evaluate(() => {
  const clip = (s, n = 60) => (s || '').toString().trim().replace(/\s+/g, ' ').slice(0, n);
  const links = [...document.querySelectorAll('a')].map(a => ({ t: clip(a.innerText, 40), href: a.getAttribute('href') })).filter(l => l.t || l.href).slice(0, 80);
  const fields = [...document.querySelectorAll('input,select,textarea,button')].map(el => ({
    tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', name: el.getAttribute('name') || '',
    id: el.id || '', ph: el.getAttribute('placeholder') || '', text: clip(el.innerText || el.value || '', 30),
  }));
  return { url: location.href, title: document.title, links, fields };
});

let out = `URL: ${info.url}\nTITLE: ${info.title}\n\nLINKS (${info.links.length}):\n`;
out += info.links.map(l => `  "${l.t}" -> ${l.href}`).join('\n');
out += `\n\nFORM FIELDS (${info.fields.length}):\n`;
out += info.fields.map(f => `  <${f.tag} type=${f.type}> name="${f.name}" id="${f.id}" ph="${f.ph}" text="${f.text}"`).join('\n');
fs.writeFileSync(`cpcb-${LABEL}.txt`, out);
console.log(out.slice(0, 5000));
await browser.close();
console.log(`\n✅ wrote cpcb-${LABEL}.txt + cpcb-${LABEL}.png`);
