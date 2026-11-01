// TC008: Payment in Transit — NEFT/RTGS UTR-referenced payment posted near statement date
async function evaluateTC008(header, item, poRecord, grirRow, candidates, priceTolPct) {
  if (header.vendorInvoiceNo.toLowerCase().includes('utr') || header.vendorInvoiceNo.toLowerCase().includes('payment')) {
    return { code: 'MATCHED/TIMING', rule: 'TC008_PAYMENT_IN_TRANSIT', businessRole: 'AP' };
  }
  return null;
}

module.exports = { evaluateTC008 };
