const fs = require('fs');
let code = fs.readFileSync('package.json', 'utf8');
code = code.replace('"url": ":memory:"', '"url": "sqlite.db"');
fs.writeFileSync('package.json', code);
