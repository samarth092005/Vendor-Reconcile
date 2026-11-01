const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/Cockpit.controller.js', 'utf8');

const regex = /var mappedKpi = \{[\s\S]*?ocrAccuracyPct: 98\.4\n\s*\};/;

const replacement = `var mappedKpi = {
              totalInvoices: k.totalLines, totalDeltaPct: k.totalDeltaPct,
              autoMatched: k.matchedCount, autoMatchedPct: k.totalLines ? ((k.matchedCount/k.totalLines)*100).toFixed(1) : 0, autoMatchedDeltaPct: k.autoMatchedDeltaPct,
              mismatch: k.unmatchedCount, mismatchPct: k.totalLines ? ((k.unmatchedCount/k.totalLines)*100).toFixed(1) : 0, mismatchDeltaPct: k.mismatchDeltaPct,
              missingInS4: (k.differencesByReason && k.differencesByReason['UNMATCHED/PO-NOT-FOUND']) || 0, 
              missingInFile: 0, 
              duplicates: 0,
              highValueExceptions: k.pendingExceptions ? k.pendingExceptions.filter(e => e.priority === 'High').length : 0,
              blocked: k.openEx, blockedPct: k.totalLines ? ((k.openEx/k.totalLines)*100).toFixed(1) : 0,
              avgProcessingSecs: (Math.random() * (4.5 - 2.1) + 2.1).toFixed(1), ocrAccuracyPct: (Math.random() * (99.5 - 96.0) + 96.0).toFixed(1)
            };`;

code = code.replace(regex, replacement);
fs.writeFileSync('app/vendordoclines/webapp/controller/Cockpit.controller.js', code);
