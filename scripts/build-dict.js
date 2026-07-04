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

const dictStart = content.indexOf('const DICT = ');
const dictEnd = content.indexOf('const Ctx = createContext');

if (dictStart !== -1 && dictEnd !== -1) {
  let innerBlock = content.substring(dictStart + 'const DICT = '.length, dictEnd);
  // strip trailing semi-colon and whitespaces
  innerBlock = innerBlock.trim();
  if (innerBlock.endsWith(';')) {
    innerBlock = innerBlock.slice(0, -1);
  }
  
  let DICT;
  try {
    DICT = eval('(' + innerBlock + ')');
  } catch(e) {
    console.log("Eval failed", e);
    process.exit(1);
  }
  
  ['en', 'hi', 'gu'].forEach(lang => {
    if (!DICT[lang]) DICT[lang] = {};
    Object.assign(DICT[lang], aggregated[lang]);
  });
  
  let newDictStr = JSON.stringify(DICT, null, 2);
  
  let newContent = content.substring(0, dictStart) + 'const DICT = ' + newDictStr + ';\n\n' + content.substring(dictEnd);
  
  fs.writeFileSync(i18nPath, newContent, 'utf8');
  console.log('Successfully rebuilt DICT block!');
} else {
  console.log('Could not find DICT block boundaries.');
}
