const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/Main.controller.js', 'utf8');
code = code.replace("vendorDocLine_ID eq ' + obj.ID", "vendorDocLine_ID eq ' + obj.ID + \"'\"");
fs.writeFileSync('app/vendordoclines/webapp/controller/Main.controller.js', code);
