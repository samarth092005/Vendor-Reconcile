// TC006: GST 2B Gap — Vendor hasn't filed GSTR-1, creating ITC risk for buyer
async function evaluateTC006(header, item, poRecord, grirRow, candidates, priceTolPct) {
  const cds = require('@sap/cds');
  const { Gstr2bInvoices } = cds.db.entities;
  
  if (Gstr2bInvoices) {
    const gstr2bItem = await SELECT.one.from(Gstr2bInvoices).where({
      invoiceNumber: header.vendorInvoiceNo
    });
    
    if (gstr2bItem) {
      if (gstr2bItem.filingStatus === 'NOT_FILED') {
        const delta = Math.abs(Number((item.itemAmount || header.invoiceGrossAmount)));
        return { code: 'UNMATCHED/GST-2B-GAP', rule: 'TC006_GST_2B_GAP', businessRole: 'BILLING', delta };
      }
      return null; // Found and filed, no gap
    }
  }

  // Fallback to statement status attribute if DB lookup is empty/missing
  if (header.gstr2bStatus === '2B Gap' || header.gstr2bStatus === '2B GAP' || (header.gstr2bStatus && header.gstr2bStatus.toLowerCase().includes('gap'))) {
    const delta = Math.abs(Number((item.itemAmount || header.invoiceGrossAmount)));
    return { code: 'UNMATCHED/GST-2B-GAP', rule: 'TC006_GST_2B_GAP', businessRole: 'BILLING', delta };
  }
  return null;
}

module.exports = { evaluateTC006 };
