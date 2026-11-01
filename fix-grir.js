const fs = require('fs');
let code = fs.readFileSync('srv/handlers/kpi-handler.js', 'utf8');

const entityRegex = /const \{ MatchResults, Exceptions, VendorInvoiceHeaders, VendorMaster, StatementUploads \} = cds\.entities\('vendorrecon\.db'\);/;
const entityReplacement = `const { MatchResults, Exceptions, VendorInvoiceHeaders, VendorMaster, StatementUploads, GrirSnapshot } = cds.entities('vendorrecon.db');`;

code = code.replace(entityRegex, entityReplacement);
fs.writeFileSync('srv/handlers/kpi-handler.js', code);
console.log("DONE");
