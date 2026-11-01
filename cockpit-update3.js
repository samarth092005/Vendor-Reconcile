const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/Cockpit.controller.js', 'utf8');

const regex = /missingInFile: 0,[\s\S]*?duplicates: 0,[\s\S]*?highValueExceptions: k\.pendingExceptions \? k\.pendingExceptions\.filter\(e => e\.priority === 'High'\)\.length : 0,/;
const replacement = `missingInFile: k.missingInFile || 0,
              duplicates: k.duplicates || 0,
              highValueExceptions: k.highValueExceptions || 0,`;
code = code.replace(regex, replacement);

fs.writeFileSync('app/vendordoclines/webapp/controller/Cockpit.controller.js', code);
console.log("DONE");
