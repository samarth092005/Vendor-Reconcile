const fs = require('fs');
let code = fs.readFileSync('srv/handlers/kpi-handler.js', 'utf8');

const regex = /const totalDelta = results\.reduce\(\(sum, r\) => sum \+ parseFloat\(r\.amountDelta \|\| 0\), 0\);/;

const replacement = `const totalDelta = results.reduce((sum, r) => sum + parseFloat(r.amountDelta || 0), 0);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentResults = results.filter(r => r.createdAt && r.createdAt > oneDayAgo);
      const oldResults = results.filter(r => !r.createdAt || r.createdAt <= oneDayAgo);
      
      const recentMatched = recentResults.filter(r => r.outcomeCode.startsWith('MATCHED')).length;
      const oldMatched = oldResults.filter(r => r.outcomeCode.startsWith('MATCHED')).length;
      
      const oldTotal = oldResults.length || 1; 
      const recentTotal = recentResults.length;
      
      const totalDeltaPct = recentTotal > 0 ? ((recentTotal - oldTotal) / oldTotal * 100).toFixed(1) : 0;
      
      const oldMatchRate = (oldMatched / oldTotal) * 100;
      const recentMatchRate = recentTotal > 0 ? (recentMatched / recentTotal) * 100 : oldMatchRate;
      const autoMatchedDeltaPct = (recentMatchRate - oldMatchRate).toFixed(1);
      
      const oldMismatchRate = 100 - oldMatchRate;
      const recentMismatchRate = 100 - recentMatchRate;
      const mismatchDeltaPct = (recentMismatchRate - oldMismatchRate).toFixed(1);
`;
code = code.replace(regex, replacement);

const returnRegex = /totalDelta,\n\s*matchRate:/;
const returnReplacement = `totalDelta,
        totalDeltaPct,
        autoMatchedDeltaPct,
        mismatchDeltaPct,
        matchRate:`;
code = code.replace(returnRegex, returnReplacement);

fs.writeFileSync('srv/handlers/kpi-handler.js', code);
