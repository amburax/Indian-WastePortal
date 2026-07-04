const fs = require('fs');
const path = require('path');
const files = [ 'ewaste.json', 'hero.json', 'heroslider.json', 'misc.json', 'mosaic.json', 'page.json', 'payment.json', 'pricing.json', 'queue.json', 'wizard2.json' ];

let aggregated = { en: {}, hi: {}, gu: {} };
files.forEach(f => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    ['en', 'hi', 'gu'].forEach(lang => {
      if (data[lang]) Object.assign(aggregated[lang], data[lang]);
    });
  } catch (e) {}
});

const i18nPath = path.join(__dirname, '../lib/i18n.jsx');
let content = fs.readFileSync(i18nPath, 'utf8');

['en', 'hi', 'gu'].forEach(lang => {
  const startStr = `${lang}: {`;
  const startIdx = content.indexOf(startStr);
  if (startIdx !== -1) {
    const endIdx = content.indexOf('}', startIdx);
    
    let toInsert = '';
    const existingBlock = content.substring(startIdx, endIdx);
    
    for (const [k, v] of Object.entries(aggregated[lang])) {
      const existsRegex = new RegExp(`'${k}'\\s*:`);
      if (!existsRegex.test(existingBlock)) {
        toInsert += `\n    '${k}': ${JSON.stringify(v)},`;
      }
    }
    
    content = content.slice(0, endIdx) + toInsert + '\n  ' + content.slice(endIdx);
  }
});

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Successfully applied all i18n');
