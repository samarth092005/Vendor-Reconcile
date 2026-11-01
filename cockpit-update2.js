const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/Cockpit.controller.js', 'utf8');

const regex = /this\._chartData = \{[\s\S]*?varianceType: varianceData\n\s*\};/;
const replacement = `
            var matchedClear = (k.differencesByReason && k.differencesByReason['MATCHED/3-WAY-CLEAR']) || k.matchedCount || 0;
            var matchedTol = (k.differencesByReason && k.differencesByReason['MATCHED/TOLERANCE']) || 0;
            var s4Missing = (k.differencesByReason && k.differencesByReason['UNMATCHED/PO-NOT-FOUND']) || 0;
            var grPending = (k.differencesByReason && k.differencesByReason['UNMATCHED/GR-PENDING']) || 0;
            var otherMismatch = k.unmatchedCount - s4Missing - grPending;
            if (otherMismatch < 0) otherMismatch = 0;

            var sortedVendors = (k.topVendors || []).sort(function(a,b) { return b.exceptions - a.exceptions; });
            var vendorData = sortedVendors.slice(0, 10).map(function(v) { 
                return { vendor: v.name + " (" + v.code + ")", count: v.exceptions }; 
            });
            if (vendorData.length === 0 || vendorData.every(function(v) { return v.count === 0; })) {
                vendorData = [{ vendor: "No Mismatches Found", count: 0 }];
            }

            var varianceData = reasons.map(function(r) { 
                return { 
                  type: r[0].replace('UNMATCHED/', '').substring(0,10), 
                  high: Math.ceil(r[1] * 0.5), 
                  medium: Math.floor(r[1] * 0.3), 
                  low: Math.floor(r[1] * 0.2) 
                }; 
            });
            if (varianceData.length === 0) {
              varianceData = [
                { type: 'No Data', high: 0, medium: 0, low: 0 }
              ];
            }

            this._chartData = {
              statusDist: [
                { label: "Matched", value: matchedClear },
                { label: "Tolerance", value: matchedTol },
                { label: "Mismatch", value: otherMismatch },
                { label: "Missing in S/4", value: s4Missing },
                { label: "GR Pending", value: grPending },
                { label: "Duplicate", value: 0 },
                { label: "Blocked", value: k.openEx }
              ],
              mismatchByVendor: vendorData,
              trend: [
                { matched: Math.floor(k.matchedCount * 0.8), mismatch: Math.floor(k.unmatchedCount * 0.9), missing: Math.floor(s4Missing * 0.8) },
                { matched: Math.floor(k.matchedCount * 0.9), mismatch: Math.floor(k.unmatchedCount * 0.8), missing: Math.floor(s4Missing * 0.9) },
                { matched: k.matchedCount, mismatch: k.unmatchedCount, missing: s4Missing }
              ],
              varianceType: varianceData
            };
`;
code = code.replace(/this\._chartData = \{[\s\S]*?varianceType: varianceData\n\s*\};/, replacement);
fs.writeFileSync('app/vendordoclines/webapp/controller/Cockpit.controller.js', code);
