const fs = require('fs');
let code = fs.readFileSync('srv/handlers/kpi-handler.js', 'utf8');

const entityRegex = /const \{ MatchResults, VendorInvoiceHeaders, StatementUploads, VendorMaster, Exceptions \} = cds\.entities\('vendorrecon\.db'\);/;
const entityReplacement = `const { MatchResults, VendorInvoiceHeaders, StatementUploads, VendorMaster, Exceptions, GrirSnapshot } = cds.entities('vendorrecon.db');`;
code = code.replace(entityRegex, entityReplacement);

const fetchRegex = /const uploads = await SELECT\.from\(StatementUploads\)\.orderBy\('createdAt desc'\)\.limit\(5\);/;
const fetchReplacement = `const uploads = await SELECT.from(StatementUploads).orderBy('createdAt desc').limit(5);
        const grs = await SELECT.from(GrirSnapshot);

        const invoicedGRs = new Set(results.map(r => r.purchaseOrder)); // Rough approximation
        let missingInFile = 0;
        grs.forEach(g => {
            if (!invoicedGRs.has(g.purchaseOrder)) missingInFile++;
        });

        let duplicates = 0;
        const invSet = new Set();
        docLines.forEach(d => {
            const key = d.sourceVendorCode + '-' + d.vendorInvoiceNo;
            if (invSet.has(key)) duplicates++;
            else invSet.add(key);
        });

        const highValueExceptions = results.filter(r => Math.abs(r.amountDelta || 0) > 50000).length;
`;
code = code.replace(fetchRegex, fetchReplacement);

const returnRegex = /pendingExceptions,/
const returnReplacement = `pendingExceptions,
          missingInFile,
          duplicates,
          highValueExceptions,`
code = code.replace(returnRegex, returnReplacement);

fs.writeFileSync('srv/handlers/kpi-handler.js', code);
console.log("DONE");
