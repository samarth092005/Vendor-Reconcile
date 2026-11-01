const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/MIROWorkbench.controller.js', 'utf8');
const regex = /ruleApplied: obj\.matchRuleApplied \|\| 'Standard Matching'/;
const replacement = `ruleApplied: obj.matchRuleApplied || 'Standard Matching',
        showMatchData: true`;
code = code.replace(regex, replacement);
fs.writeFileSync('app/vendordoclines/webapp/controller/MIROWorkbench.controller.js', code);
