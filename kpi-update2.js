const fs = require('fs');
let code = fs.readFileSync('srv/handlers/kpi-handler.js', 'utf8');

const regex = /const byReason = \{\};\s*results\.filter[\s\S]*?\}\);/;
const replacement = `const byReason = {};
      results.forEach(r => {
        if (r.outcomeCode) {
          byReason[r.outcomeCode] = (byReason[r.outcomeCode] || 0) + 1;
        }
      });`;

code = code.replace(regex, replacement);

fs.writeFileSync('srv/handlers/kpi-handler.js', code);
