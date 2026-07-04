const fs = require('fs');
const path = require('path');

const files = [
  'ewaste.json',
  'hero.json',
  'heroslider.json',
  'misc.json',
  'mosaic.json',
  'page.json',
  'payment.json',
  'pricing.json',
  'queue.json',
  'wizard2.json'
];

let aggregated = { en: {}, hi: {}, gu: {} };

files.forEach(f => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    ['en', 'hi', 'gu'].forEach(lang => {
      if (data[lang]) {
        Object.assign(aggregated[lang], data[lang]);
      }
    });
  } catch (e) {
    console.log('Skipping or Error on', f, e.message);
  }
});

const i18nPath = path.join(__dirname, '../lib/i18n.jsx');
let content = fs.readFileSync(i18nPath, 'utf8');

['en', 'hi', 'gu'].forEach(lang => {
  for (const [k, v] of Object.entries(aggregated[lang])) {
    const safeV = v.replace(/'/g, "\\'").replace(/\r?\n/g, '\\n');
    
    // Look for single quote literal
    const keyRegex = new RegExp(`('${k}'\\s*:\\s*)'(.*?)'(?=[,\\n\\r\\s])`, 'g');
    // Look for template literal
    const keyRegexTemplate = new RegExp(`('${k}'\\s*:\\s*)\`(.*?)\`(?=[,\\n\\r\\s])`, 'g');

    if (keyRegex.test(content)) {
      content = content.replace(keyRegex, `$1'${safeV}'`);
    } else if (keyRegexTemplate.test(content)) {
      content = content.replace(keyRegexTemplate, `$1\`${v}\``);
    }
  }
});

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Fixed i18n.jsx');
