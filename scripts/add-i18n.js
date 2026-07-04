const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '../lib/i18n.jsx');
let content = fs.readFileSync(i18nPath, 'utf8');

const newKeys = JSON.parse(fs.readFileSync(0, 'utf8')); // read from stdin

['en', 'hi', 'gu'].forEach(lang => {
  const langRegex = new RegExp(`(${lang}:\\s*\\{)([\\s\\S]*?)(\\n\\s*\\},)`, 'm');
  const match = content.match(langRegex);
  
  if (match && newKeys[lang]) {
    let toInsert = '';
    for (const [k, v] of Object.entries(newKeys[lang])) {
      // Escape single quotes
      const safeV = v.replace(/'/g, "\\'");
      toInsert += `\n    '${k}': '${safeV}',`;
    }
    content = content.replace(langRegex, `$1$2${toInsert}$3`);
  }
});

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Successfully updated i18n.jsx');
