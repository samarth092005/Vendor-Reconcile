const fs = require('fs');
let code = fs.readFileSync('srv/s21-connector.js', 'utf8');

const entityRegex = /const \{ PurchaseOrders, VendorInvoiceHeaders, VendorInvoiceItems, GrirSnapshot \} = cds\.entities\('vendorrecon\.db'\);/;
const entityReplacement = `const { PurchaseOrders, VendorInvoiceHeaders, VendorInvoiceItems, GrirSnapshot, VendorMaster } = cds.entities('vendorrecon.db');`;
code = code.replace(entityRegex, entityReplacement);

const poLoopRegex = /const poNumber = s21Po\.PurchaseOrder;[\s\S]*?log\.info\("Checking PO " \+ poNumber \+ ": exists=" \+ !!exists\);/;
const poLoopReplacement = `const poNumber = s21Po.PurchaseOrder;
                    const supplierCode = s21Po.Supplier;
                    const supplierName = s21Po.AddressName || s21Po.SupplierRespSalesPersonName || supplierCode;
                    
                    if (supplierCode) {
                        const vendorExists = await tx.run(SELECT.one.from(VendorMaster).where({ businessPartner: supplierCode }));
                        if (!vendorExists) {
                            await tx.run(INSERT.into(VendorMaster).entries({
                                ID: cds.utils.uuid(),
                                businessPartner: supplierCode,
                                businessPartnerName: supplierName,
                                currency: s21Po.DocumentCurrency || 'INR',
                                state: s21Po.AddressRegion || '',
                                paymentTerms: s21Po.PaymentTerms || ''
                            }));
                        } else if (vendorExists.businessPartnerName !== supplierName && supplierName !== supplierCode) {
                            await tx.run(UPDATE(VendorMaster).set({ businessPartnerName: supplierName }).where({ businessPartner: supplierCode }));
                        }
                    }

                    const exists = await tx.run(SELECT.one.from(PurchaseOrders).where({ purchaseOrder: poNumber }));
                    log.info("Checking PO " + poNumber + ": exists=" + !!exists);`;
code = code.replace(poLoopRegex, poLoopReplacement);

fs.writeFileSync('srv/s21-connector.js', code);
console.log("DONE");
