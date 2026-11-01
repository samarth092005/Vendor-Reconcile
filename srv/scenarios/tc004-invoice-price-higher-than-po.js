// TC004: Invoice Price Higher than PO
async function evaluateTC004(header, item, poRecord, grirRow, candidates, priceTolPct) {
  if (!poRecord) return null;
  const poAmount = poRecord.poAmount || (poRecord.poQty * poRecord.poPrice) || 0; // if line level poAmount is not populated
  const basicAmount = item.itemAmount || (item.unitPrice * item.invoicedQty);
  
  if (basicAmount > poAmount && poAmount > 0) {
    const diff = basicAmount - poAmount;
    const diffPct = (diff / poAmount) * 100;
    
    // Use the dynamic tolerance passed from VendorMaster (or fallback to 2.00)
    const toleranceLimit = priceTolPct != null ? priceTolPct : 2.00;
    
    if (diffPct <= toleranceLimit) {
      return { code: 'MATCHED/PRICE-TOLERANCE', rule: 'TC004_PRICE_TOLERANCE', businessRole: 'AP', delta: diff };
    } else {
      return { code: 'UNMATCHED/PRICE-HIGH', rule: 'TC004_PRICE_HIGH', businessRole: 'MIRO', delta: diff };
    }
  }
  return null;
}

module.exports = { evaluateTC004 };
