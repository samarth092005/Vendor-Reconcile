// TC001: Standard 3-Way Match — PO Qty = GR Qty = Invoice Qty (all Pass)
async function evaluateTC001(header, item, poRecord, grirRow, candidates, priceTolPct) {
  if (!poRecord || !grirRow) return null;
  const poQty = poRecord.poQty, grQty = grirRow.goodsReceiptQty, invQty = item.invoicedQty;
  
  // Calculate basic amount of invoice (excluding GST/TDS tax)
  const basicAmount = (item.itemAmount || header.invoiceGrossAmount) - (header.gstTdsAmount || 0);
  const poAmount = poRecord.poAmount;
  
  // Verify both quantities and unit rate / total basic price match
  if (poQty === grQty && grQty === invQty && Math.abs(basicAmount - poAmount) <= 1.00) {
    return { code: 'MATCHED/3WAY', rule: 'TC001_STANDARD_MATCH', businessRole: 'AP' };
  }
  return null;
}

module.exports = { evaluateTC001 };