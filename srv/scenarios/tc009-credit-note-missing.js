// TC009: Credit Note Missing — CN issued by vendor but not yet booked in buyer's ledger
async function evaluateTC009(header, item, poRecord, grirRow, candidates, priceTolPct) {
  const isCreditNote = (item.itemAmount || header.invoiceGrossAmount) < 0 || 
                       (header.vendorInvoiceNo && (header.vendorInvoiceNo.startsWith('CN-') || header.vendorInvoiceNo.startsWith('CN')));
  
  if (isCreditNote) {
    const hasLedgerMatch = candidates && candidates.some(c => 
      Math.abs(Math.abs(c.amountInTransCrcy) - Math.abs((item.itemAmount || header.invoiceGrossAmount))) <= 1.00
    );
    if (!hasLedgerMatch) {
      const delta = Math.abs(Number((item.itemAmount || header.invoiceGrossAmount)));
      return { code: 'UNMATCHED/CN-MISSING', rule: 'TC009_CN_MISSING', businessRole: 'AP', delta };
    }
  }
  return null;
}

module.exports = { evaluateTC009 };
