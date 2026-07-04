const fs = require('fs');
let code = fs.readFileSync('lib/i18n.jsx', 'utf8');

code = code.replace(/'wizard\.waMsg': '([\s\S]*?)'/g, (match, p1) => {
  const escaped = p1.replace(/\r?\n/g, '\\n');
  return `'wizard.waMsg': \`${escaped}\``;
});

fs.writeFileSync('lib/i18n.jsx', code);
