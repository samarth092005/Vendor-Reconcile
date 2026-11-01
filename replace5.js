const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/Main.controller.js', 'utf8');
const regex = /ruleApplied: obj\.matchRuleApplied \|\| \(mr && mr\.matchRuleApplied\) \|\| 'Standard Matching'/;
const replacement = `ruleApplied: obj.matchRuleApplied || (mr && mr.matchRuleApplied) || 'Standard Matching',
        showMatchData: oCtx && !oCtx.getPath().includes('VendorDocLines')`;
code = code.replace(regex, replacement);
fs.writeFileSync('app/vendordoclines/webapp/controller/Main.controller.js', code);
