const fs = require('fs');
let code = fs.readFileSync('srv/s21-connector.js', 'utf8');

const invLoopRegex = /const invNo = s21Inv\.SupplierInvoice;\s*const fy = s21Inv\.FiscalYear;/;
const invLoopReplacement = `const invNo = s21Inv.SupplierInvoice;
                      const fy = s21Inv.FiscalYear;
                      const supplierCode = s21Inv.InvoicingParty;
                      if (supplierCode) {
                          const vendorExists = await tx.run(SELECT.one.from(VendorMaster).where({ businessPartner: supplierCode }));
                          if (!vendorExists) {
                              await tx.run(INSERT.into(VendorMaster).entries({
                                  ID: cds.utils.uuid(),
                                  businessPartner: supplierCode,
                                  businessPartnerName: supplierCode, // fallback to code if name unknown
                                  currency: s21Inv.DocumentCurrency || 'INR'
                              }));
                          }
                      }`;
code = code.replace(invLoopRegex, invLoopReplacement);
fs.writeFileSync('srv/s21-connector.js', code);
console.log("DONE");
