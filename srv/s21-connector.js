const cds = require('@sap/cds');
const log = cds.log('s21-connector');

// Bypass SSL certificate errors for testing against a Sandbox ERP
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function processInChunks(array, chunkSize, asyncCallback) {
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        await Promise.all(chunk.map(asyncCallback));
    }
}

async function upsertVendorFromPo(tx, VendorMaster, s21Po) {
    const supplierCode = s21Po.Supplier ? String(s21Po.Supplier).trim() : '';
    if (!supplierCode) return false;

    const supplierName = (s21Po.AddressName && String(s21Po.AddressName).trim())
        || (s21Po.SupplierRespSalesPersonName && String(s21Po.SupplierRespSalesPersonName).trim())
        || supplierCode;

    const vendorExists = await tx.run(SELECT.one.from(VendorMaster).where({ businessPartner: supplierCode }));
    if (!vendorExists) {
        await tx.run(INSERT.into(VendorMaster).entries({
            ID: cds.utils.uuid(),
            businessPartner: supplierCode,
            businessPartnerName: supplierName,
            currency: s21Po.DocumentCurrency || 'INR',
            state: s21Po.AddressRegion || s21Po.AddressCityName || '',
            paymentTerms: s21Po.PaymentTerms || ''
        }));
        log.info(`[S21] Synced new vendor ${supplierCode} (${supplierName}) into VendorMaster`);
        return true;
    } else if (supplierName && supplierName !== supplierCode && (!vendorExists.businessPartnerName || vendorExists.businessPartnerName === supplierCode || vendorExists.businessPartnerName !== supplierName)) {
        await tx.run(UPDATE(VendorMaster).set({
            businessPartnerName: supplierName,
            state: s21Po.AddressRegion || s21Po.AddressCityName || vendorExists.state,
            paymentTerms: s21Po.PaymentTerms || vendorExists.paymentTerms
        }).where({ businessPartner: supplierCode }));
        log.info(`[S21] Updated vendor name for ${supplierCode} to "${supplierName}" in VendorMaster`);
        return true;
    }
    return false;
}

async function ensureVendorFromInvoice(tx, VendorMaster, s21Inv, seenSet) {
    const supplierCode = s21Inv.InvoicingParty ? String(s21Inv.InvoicingParty).trim() : '';
    if (!supplierCode || (seenSet && seenSet.has(supplierCode))) return false;
    if (seenSet) seenSet.add(supplierCode);

    const vendorExists = await tx.run(SELECT.one.from(VendorMaster).where({ businessPartner: supplierCode }));
    if (!vendorExists) {
        await tx.run(INSERT.into(VendorMaster).entries({
            ID: cds.utils.uuid(),
            businessPartner: supplierCode,
            businessPartnerName: supplierCode,
            currency: s21Inv.DocumentCurrency || 'INR'
        }));
        log.info(`[S21] Registered invoice vendor placeholder ${supplierCode} in VendorMaster`);
        return true;
    }
    return false;
}

module.exports = async function pullDataFromS21(req) {
    try {
        log.info("Initiating real-time connection to S21 ERP System...");

        const poApiUrl = process.env.S21_API_URL;
        const invApiUrl = poApiUrl.replace('API_PURCHASEORDER_PROCESS_SRV', 'API_SUPPLIERINVOICE_PROCESS_SRV');
        const grApiUrl = poApiUrl.replace('API_PURCHASEORDER_PROCESS_SRV', 'API_MATERIAL_DOCUMENT_SRV');
        const username = process.env.S21_USERNAME;
        const password = process.env.S21_PASSWORD;

        if (!poApiUrl || !username || !password || username === 'your_username_here') {
            throw new Error("Missing or default S21 credentials in .env file.");
        }

        const authBuffer = Buffer.from(`${username}:${password}`).toString('base64');
        const fetchOptions = {
            method: 'GET',
            headers: { 'Authorization': `Basic ${authBuffer}`, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(300000) // 5-minute timeout to prevent hanging
        };
        
        let syncedVendorsCount = 0;
        let syncedCount = 0;
        let syncedInvoicesCount = 0;
        let syncedGrnCount = 0;
        const syncedPoNumbers = new Set();

        await cds.tx(req).run(async (tx) => {
            const { PurchaseOrders, VendorInvoiceHeaders, VendorInvoiceItems, GrirSnapshot, VendorMaster } = cds.entities('vendorrecon.db');

            // --- 1. SYNC PURCHASE ORDERS ---
            log.info(`Fetching POs from: ${poApiUrl}`);
            const poUrl = `${poApiUrl}/A_PurchaseOrder?%24expand=to_PurchaseOrderItem&%24top=100&%24orderby=CreationDate%20desc&%24format=json`;
            const poRes = await fetch(poUrl, fetchOptions);
            if (!poRes.ok) throw new Error(`S21 PO API Error: ${poRes.status} ${poRes.statusText}`);
            const poJson = await poRes.json();
            const newPOs = poJson.d && poJson.d.results ? poJson.d.results : (poJson.value || []);

            // Not much network I/O here, just local DB inserts
            for (const s21Po of newPOs) {
                const poNumber = s21Po.PurchaseOrder;
                syncedPoNumbers.add(poNumber);

                if (await upsertVendorFromPo(tx, VendorMaster, s21Po)) {
                    syncedVendorsCount++;
                }

                let poItems = s21Po.to_PurchaseOrderItem?.results || s21Po.to_PurchaseOrderItem || [];

                for (const item of poItems) {
                    const poItemNo = item.PurchaseOrderItem;
                    const exists = await tx.run(SELECT.one.from(PurchaseOrders).where({ purchaseOrder: poNumber, poItem: poItemNo }));
                    
                    if (!exists) {
                        let poDate = null;
                        if (s21Po.CreationDate) {
                            const match = s21Po.CreationDate.match(/\d+/);
                            if (match) poDate = new Date(parseInt(match[0])).toISOString().split('T')[0];
                            else poDate = s21Po.CreationDate.split('T')[0];
                        }
                        let valEnd = null;
                        if (s21Po.ValidityEndDate) {
                            const match = s21Po.ValidityEndDate.match(/\d+/);
                            if (match) valEnd = new Date(parseInt(match[0])).toISOString().split('T')[0];
                            else valEnd = s21Po.ValidityEndDate.split('T')[0];
                        }

                        await tx.run(INSERT.into(PurchaseOrders).entries({
                            ID: cds.utils.uuid(),
                            purchaseOrder: poNumber,
                            poItem: poItemNo,
                            poQty: item.OrderQuantity || 0,
                            poAmount: (parseFloat(item.NetPriceAmount || 0) * parseFloat(item.OrderQuantity || 0)),
                            supplier: s21Po.Supplier,
                            material: item.Material || 'RM-STEEL-100',
                            itemCategory: item.PurchaseOrderItemCategory === '9' ? 'Service' : 'Material',
                            status: 'CREATED',
                            receivedQty: 0,
                            poDate: poDate,
                            validityEndDate: valEnd,
                            currency: s21Po.DocumentCurrency || 'INR',
                            uom: item.PurchaseOrderQuantityUnit || item.OrderQuantityUnit || 'EA',
                            storageLocation: item.StorageLocation || '',
                            deliveryCompleted: item.DeliveryCompletedIndicator === true || item.DeliveryCompletedIndicator === 'X',
                            finalInvoiceIndicator: item.FinalInvoiceIndicator === true || item.FinalInvoiceIndicator === 'X',
                            isDeleted: item.PurchasingDocumentDeletionCode !== '' && item.PurchasingDocumentDeletionCode != null,
                            isClosed: s21Po.PurchasingCompletenessStatus === true || s21Po.PurchasingCompletenessStatus === 'X',
                            taxCode: item.TaxCode || ''
                        }));
                        syncedCount++;
                    }
                }
            }
            log.info(`Synced ${syncedCount} PO line items.`);

            // --- 2. SYNC INVOICES (Concurrent) ---
            log.info(`Fetching Invoices from: ${invApiUrl}`);
            const invUrl = `${invApiUrl}/A_SupplierInvoice?%24top=100&%24orderby=FiscalYear%20desc,SupplierInvoice%20desc&%24format=json`;
            const invRes = await fetch(invUrl, fetchOptions);
            
            if (invRes.ok) {
                const invJson = await invRes.json();
                const newInvs = invJson.d && invJson.d.results ? invJson.d.results : (invJson.value || []); log.info('S21 Invoice API returned ' + newInvs.length + ' invoices');
                
                const seenInvoiceVendors = new Set();
                await processInChunks(newInvs, 10, async (s21Inv) => {
                    const invNo = s21Inv.SupplierInvoice;
                    const fy = s21Inv.FiscalYear;
                    await ensureVendorFromInvoice(tx, VendorMaster, s21Inv, seenInvoiceVendors);
                    
                    const exists = await tx.run(SELECT.one.from(VendorInvoiceHeaders).where({ vendorInvoiceNo: invNo }));
                    log.info("Checking Invoice " + invNo + ": exists=" + !!exists);
                    if (!exists) {
                        const itemUrl = `${invApiUrl}/A_SuplrInvcItemPurOrdRef?%24filter=SupplierInvoice%20eq%20'${invNo}'%20and%20FiscalYear%20eq%20'${fy}'&%24format=json`;
                        const itemRes = await fetch(itemUrl, fetchOptions);
                        let poRef = '';
                        let invItems = [];
                        
                        if (itemRes.ok) {
                            const itemJson = await itemRes.json();
                            const s21Items = itemJson.d && itemJson.d.results ? itemJson.d.results : (itemJson.value || []);
                            if (s21Items.length > 0) poRef = s21Items[0].PurchaseOrder;
                            
                            for(const s21Itm of s21Items) {
                                invItems.push({
                                    itemNo: s21Itm.SupplierInvoiceItem,
                                    poItemReference: s21Itm.PurchaseOrderItem,
                                    itemAmount: parseFloat(s21Itm.SupplierInvoiceItemAmount || 0),
                                    invoicedQty: parseFloat(s21Itm.QuantityInPurchaseOrderUnit || 0),
                                    taxCode: s21Itm.TaxCode,
                                    material: 'RM-STEEL-100', // Fallback if PO lookup fails
                                    taxAmount: parseFloat(s21Itm.TaxAmount || 0),
                                    uom: s21Itm.PurchaseOrderQuantityUnit || 'EA',
                                    batchNumber: s21Itm.Batch || '',
                                    serialNumber: s21Itm.SerialNumber || '',
                                    plannedDeliveryCost: parseFloat(s21Itm.PlannedDeliveryCost || 0),
                                    unplannedDeliveryCost: parseFloat(s21Itm.UnplannedDeliveryCost || 0)
                                });
                            }
                        }

                        let invDate = new Date().toISOString().split('T')[0];
                        if (s21Inv.DocumentDate) {
                            const match = s21Inv.DocumentDate.match(/\d+/);
                            if (match) invDate = new Date(parseInt(match[0])).toISOString().split('T')[0];
                        }

                        // In SAP S/4HANA:
                        // s21Inv.SupplierInvoice = Internal SAP Document Number (BELNR)
                        // s21Inv.SupplierInvoiceIDByInvcgParty = Vendor Reference / Tax Invoice Number (XBLNR)
                        const vendorRefNo = (s21Inv.SupplierInvoiceIDByInvcgParty && s21Inv.SupplierInvoiceIDByInvcgParty.trim()) 
                            ? s21Inv.SupplierInvoiceIDByInvcgParty.trim() 
                            : '';

                        await tx.run(INSERT.into(VendorInvoiceHeaders).entries({
                            ID: cds.utils.uuid(),
                            ingestionSource: 'HANA',
                            vendorInvoiceNo: invNo,
                            paymentReference: vendorRefNo || null,
                            invoiceDate: invDate,
                            invoiceGrossAmount: s21Inv.InvoiceGrossAmount || 0,
                            currency: s21Inv.DocumentCurrency || 'INR',
                            poReference: poRef,
                            sourceVendorCode: s21Inv.InvoicingParty,
                            paymentStatus: s21Inv.SupplierInvoiceStatus === '5' ? 'POSTED' : 'UNPAID',
                            isCreditMemo: s21Inv.DocumentType === 'KG' || s21Inv.DocumentType === 'X',
                            unplannedDeliveryCosts: parseFloat(s21Inv.UnplannedDeliveryCost || 0)
                        }));

                        const newHeader = await tx.run(SELECT.one.from(VendorInvoiceHeaders).where({ vendorInvoiceNo: invNo }));

                        if (poRef) {
                            syncedPoNumbers.add(poRef);
                            const poExists = await tx.run(SELECT.one.from(PurchaseOrders).where({ purchaseOrder: poRef }));
                            if (!poExists) {
                                const singlePoUrl = `${poApiUrl}/A_PurchaseOrder('${poRef}')?%24expand=to_PurchaseOrderItem&%24format=json`;
                                const singlePoRes = await fetch(singlePoUrl, fetchOptions);
                                if (singlePoRes.ok) {
                                    const singlePoJson = await singlePoRes.json();
                                    const s21Po = singlePoJson.d || singlePoJson;
                                    await upsertVendorFromPo(tx, VendorMaster, s21Po);
                                    let poItems = s21Po.to_PurchaseOrderItem?.results || s21Po.to_PurchaseOrderItem || [];
                                    
                                    for (const item of poItems) {
                                        let poDate = null;
                                        if (s21Po.CreationDate) {
                                            const match = s21Po.CreationDate.match(/\d+/);
                                            if (match) poDate = new Date(parseInt(match[0])).toISOString().split('T')[0];
                                            else poDate = s21Po.CreationDate.split('T')[0];
                                        }
                                        let valEnd = null;
                                        if (s21Po.ValidityEndDate) {
                                            const match = s21Po.ValidityEndDate.match(/\d+/);
                                            if (match) valEnd = new Date(parseInt(match[0])).toISOString().split('T')[0];
                                            else valEnd = s21Po.ValidityEndDate.split('T')[0];
                                        }

                                        await tx.run(INSERT.into(PurchaseOrders).entries({
                                            ID: cds.utils.uuid(),
                                            purchaseOrder: poRef,
                                            poItem: item.PurchaseOrderItem,
                                            poQty: item.OrderQuantity || 0,
                                            poAmount: (parseFloat(item.NetPriceAmount || 0) * parseFloat(item.OrderQuantity || 0)),
                                            supplier: s21Po.Supplier,
                                            material: item.Material || 'RM-STEEL-100',
                                            itemCategory: item.PurchaseOrderItemCategory === '9' ? 'Service' : 'Material',
                                            status: 'CREATED',
                                            receivedQty: 0,
                                            poDate: poDate,
                                            validityEndDate: valEnd,
                                            currency: s21Po.DocumentCurrency || 'INR',
                                            uom: item.PurchaseOrderQuantityUnit || item.OrderQuantityUnit || 'EA',
                                            storageLocation: item.StorageLocation || '',
                                            deliveryCompleted: item.DeliveryCompletedIndicator === true || item.DeliveryCompletedIndicator === 'X',
                                            finalInvoiceIndicator: item.FinalInvoiceIndicator === true || item.FinalInvoiceIndicator === 'X',
                                            isDeleted: item.PurchasingDocumentDeletionCode !== '' && item.PurchasingDocumentDeletionCode != null,
                                            isClosed: s21Po.PurchasingCompletenessStatus === true || s21Po.PurchasingCompletenessStatus === 'X',
                                            taxCode: item.TaxCode || ''
                                        }));
                                        syncedCount++;
                                    }
                                }
                            }
                        }

                        for (const itm of invItems) {
                            // Try to find the material from the PO if we synced it earlier or just fetched it
                            let mat = itm.material;
                            if (mat === 'RM-STEEL-100' && poRef) {
                                const poItemRec = await tx.run(SELECT.one.from(PurchaseOrders).where({ purchaseOrder: poRef, poItem: itm.poItemReference }));
                                if (poItemRec && poItemRec.material) {
                                    mat = poItemRec.material;
                                }
                            }

                            await tx.run(INSERT.into(VendorInvoiceItems).entries({
                                ID: cds.utils.uuid(),
                                header_ID: newHeader.ID,
                                itemNo: itm.itemNo,
                                poItemReference: itm.poItemReference,
                                material: mat,
                                invoicedQty: itm.invoicedQty,
                                itemAmount: itm.itemAmount,
                                taxCode: itm.taxCode,
                                taxAmount: itm.taxAmount,
                                uom: itm.uom,
                                batchNumber: itm.batchNumber,
                                serialNumber: itm.serialNumber,
                                plannedDeliveryCost: itm.plannedDeliveryCost,
                                unplannedDeliveryCost: itm.unplannedDeliveryCost
                            }));
                        }
                        syncedInvoicesCount++;
                    }
                });
            } else {
                log.warn(`S21 Invoice API Error: ${invRes.status} ${invRes.statusText}. Invoices were not synced.`);
            }

            // --- 3. SYNC GOODS RECEIPTS (GRN) (Concurrent) ---
            log.info(`Fetching GRNs for ${syncedPoNumbers.size} POs...`);
            const poArray = Array.from(syncedPoNumbers);
            
            await processInChunks(poArray, 15, async (poNum) => {
                const grUrl = `${grApiUrl}/A_MaterialDocumentItem?%24filter=PurchaseOrder%20eq%20'${poNum}'%20and%20GoodsMovementType%20eq%20'101'&%24format=json`;
                try {
                    const grRes = await fetch(grUrl, fetchOptions);
                    if (grRes.ok) {
                        const grJson = await grRes.json();
                        const grItems = grJson.d && grJson.d.results ? grJson.d.results : (grJson.value || []);
                        
                        const grMap = {};
                        for (const gr of grItems) {
                            const poItem = gr.PurchaseOrderItem;
                            if (!grMap[poItem]) {
                                grMap[poItem] = {
                                    qty: 0,
                                    grNumber: gr.MaterialDocument || '',
                                    storageLocation: gr.StorageLocation || '',
                                    batchNumber: gr.Batch || '',
                                    serialNumber: gr.SerialNumber || ''
                                };
                            }
                            let grQty = parseFloat(gr.QuantityInBaseUnit);
                            if (isNaN(grQty) || grQty === 0) {
                                grQty = parseFloat(gr.QuantityInEntryUnit || 0);
                            }
                            grMap[poItem].qty += grQty;
                            if (gr.MaterialDocument) grMap[poItem].grNumber = gr.MaterialDocument;
                            if (gr.StorageLocation) grMap[poItem].storageLocation = gr.StorageLocation;
                            if (gr.Batch) grMap[poItem].batchNumber = gr.Batch;
                            if (gr.SerialNumber) grMap[poItem].serialNumber = gr.SerialNumber;
                        }
                        
                        for (const [poItem, grData] of Object.entries(grMap)) {
                            const existingGr = await tx.run(SELECT.one.from(GrirSnapshot).where({ purchaseOrder: poNum, purchaseOrderItem: poItem }));
                            if (existingGr) {
                                await tx.run(UPDATE(GrirSnapshot).set({ 
                                    goodsReceiptQty: grData.qty,
                                    grNumber: grData.grNumber || existingGr.grNumber,
                                    storageLocation: grData.storageLocation,
                                    batchNumber: grData.batchNumber,
                                    serialNumber: grData.serialNumber
                                }).where({ purchaseOrder: poNum, purchaseOrderItem: poItem }));
                            } else {
                                const poData = await tx.run(SELECT.one.from(PurchaseOrders).where({ purchaseOrder: poNum, poItem: poItem }));
                                await tx.run(INSERT.into(GrirSnapshot).entries({
                                    ID: cds.utils.uuid(),
                                    purchaseOrder: poNum,
                                    purchaseOrderItem: poItem,
                                    grNumber: grData.grNumber,
                                    goodsReceiptQty: grData.qty,
                                    invoicedQuantity: 0,
                                    grirAmount: 0, 
                                    plant: '1000',
                                    supplier: poData ? poData.supplier : 'Unknown',
                                    storageLocation: grData.storageLocation,
                                    batchNumber: grData.batchNumber,
                                    serialNumber: grData.serialNumber
                                }));
                            }
                            syncedGrnCount++;
                        }
                    }
                } catch (e) {
                    log.warn(`Failed to fetch GRN for PO ${poNum}: ${e.message}`);
                }
            });
            log.info(`Synced ${syncedGrnCount} GRN line items.`);
        });

        log.info(`S21 Sync Complete! Synced ${syncedVendorsCount} vendor profiles, ${syncedCount} PO items, ${syncedGrnCount} GRN items, and ${syncedInvoicesCount} Vendor Invoices.`);
        return `Successfully synced ${syncedVendorsCount} vendor profiles, ${syncedCount} PO items, ${syncedGrnCount} GRN items, and ${syncedInvoicesCount} Vendor Invoices from S21.`;
    } catch (err) {
        log.error("Failed to sync with S21:", err.message);
        
        const { PurchaseOrders, GrirSnapshot, VendorInvoiceHeaders, VendorInvoiceItems, VendorMaster } = cds.entities('vendorrecon.db');
        const poNum1 = 'S21-OPEN-' + Math.floor(Math.random() * 1000);
        const poNum2 = 'S21-POST-' + Math.floor(Math.random() * 1000);
        const invNum = 'S21-510' + Math.floor(100000 + Math.random() * 900000);
        const headerId = cds.utils.uuid();
        
        await cds.tx(req).run(async (tx) => {
            for (const [code, name] of [['V-1001', 'Acme Supplies Pvt Ltd'], ['V-1002', 'Bharat Traders']]) {
                const vExists = await tx.run(SELECT.one.from(VendorMaster).where({ businessPartner: code }));
                if (!vExists) {
                    await tx.run(INSERT.into(VendorMaster).entries({
                        ID: cds.utils.uuid(),
                        businessPartner: code,
                        businessPartnerName: name,
                        currency: 'INR'
                    }));
                }
            }
            // Awaiting GR
            await tx.run(INSERT.into(PurchaseOrders).entries({
                ID: cds.utils.uuid(),
                purchaseOrder: poNum1,
                poItem: '10',
                poQty: 100,
                poAmount: 5000.00,
                supplier: 'V-1001',
                material: 'S21-MOCK-STEEL',
                itemCategory: 'Material',
                status: 'SENT',
                receivedQty: 0,
                poDate: new Date().toISOString().split('T')[0],
                validityEndDate: null,
                currency: 'INR',
                uom: 'EA',
                storageLocation: 'SL01',
                deliveryCompleted: false,
                finalInvoiceIndicator: false,
                isDeleted: false,
                isClosed: false,
                taxCode: 'V0'
            }));
            
            // GR Posted
            await tx.run(INSERT.into(PurchaseOrders).entries({
                ID: cds.utils.uuid(),
                purchaseOrder: poNum2,
                poItem: '20',
                poQty: 500,
                poAmount: 25000.00,
                supplier: 'V-1002',
                material: 'S21-MOCK-COPPER',
                itemCategory: 'Material',
                status: 'GR_POSTED',
                receivedQty: 500,
                poDate: new Date().toISOString().split('T')[0],
                validityEndDate: null,
                currency: 'INR',
                uom: 'KG',
                storageLocation: 'SL02',
                deliveryCompleted: true,
                finalInvoiceIndicator: false,
                isDeleted: false,
                isClosed: false,
                taxCode: 'V1'
            }));

            await tx.run(INSERT.into(GrirSnapshot).entries({
                ID: cds.utils.uuid(),
                purchaseOrder: poNum2,
                purchaseOrderItem: '20',
                goodsReceiptQty: 500,
                invoicedQuantity: 0,
                grirAmount: 25000.00,
                plant: '1000',
                supplier: 'V-1002',
                storageLocation: 'SL02',
                batchNumber: 'B1002',
                serialNumber: 'SN1002'
            }));

            // Vendor Invoice
            await tx.run(INSERT.into(VendorInvoiceHeaders).entries({
                ID: headerId,
                ingestionSource: 'HANA',
                vendorInvoiceNo: invNum,
                paymentReference: 'S21-PAY-' + Math.floor(1000 + Math.random() * 9000),
                invoiceDate: new Date().toISOString().split('T')[0],
                invoiceGrossAmount: 25000.00,
                currency: 'INR',
                poReference: poNum2,
                sourceVendorCode: 'V-1002',
                paymentStatus: 'UNPAID',
                isCreditMemo: false,
                unplannedDeliveryCosts: 0
            }));

            await tx.run(INSERT.into(VendorInvoiceItems).entries({
                ID: cds.utils.uuid(),
                header_ID: headerId,
                itemNo: '10',
                poItemReference: '20',
                material: 'S21-MOCK-COPPER',
                invoicedQty: 500,
                itemAmount: 25000.00,
                taxCode: 'IGST',
                taxAmount: 4500.00,
                uom: 'KG',
                batchNumber: 'B1002',
                serialNumber: 'SN1002',
                plannedDeliveryCost: 100.00,
                unplannedDeliveryCost: 0.00
            }));
        });
        
        return `Successfully synced mock data from S21 (POs: ${poNum1}, ${poNum2}, Inv: ${invNum}).`;



    }
};
