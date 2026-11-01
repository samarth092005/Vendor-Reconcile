const cds = require('@sap/cds');

async function seedFakeS21Invoices() {
    console.log("Seeding fake vendor invoices for the S21 Purchase Orders...");
    const db = await cds.connect.to('sqlite:db.sqlite');
    
    // Get the POs we just synced
    const pos = await db.run(`SELECT * FROM vendorrecon_db_PurchaseOrders LIMIT 10`);
    
    if (!pos || pos.length === 0) {
        console.log("No POs found. Cannot generate fake invoices.");
        return;
    }

    const uploadId = cds.utils.uuid();
    await db.run(`INSERT INTO vendorrecon_db_StatementUploads (ID, vendorCode, companyCode, period, fiscalYear, fileName, status) VALUES (?, ?, ?, ?, ?, ?, ?)`, [uploadId, pos[0].supplier, '1000', '09-2026', '2026', 'S21_Auto_Statement.xlsx', 'MATCHED']);

    for (let i = 0; i < pos.length; i++) {
        const po = pos[i];
        const headerId = cds.utils.uuid();
        const itemId = cds.utils.uuid();
        const resultId = cds.utils.uuid();
        const exceptionId = cds.utils.uuid();

        // 1. Fake Invoice
        await db.run(`INSERT INTO vendorrecon_db_VendorInvoiceHeaders (ID, statementUploadId, vendorInvoiceNo, invoiceDate, invoiceGrossAmount, currency, poReference, sourceVendorCode, approvedForPayment, paymentStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [headerId, uploadId, `INV-S21-${po.purchaseOrder}`, new Date().toISOString().split('T')[0], po.poAmount + 100, 'INR', po.purchaseOrder, po.supplier, 0, 'UNPAID']);

        await db.run(`INSERT INTO vendorrecon_db_VendorInvoiceItems (ID, header_ID, itemNo, material, poItemReference, invoicedQty, unitPrice, itemAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [itemId, headerId, po.poItem, po.material, po.poItem, po.poQty, (po.poAmount / (po.poQty || 1)) + 10, po.poAmount + 100]);

        // 2. Fake Match Result
        await db.run(`INSERT INTO vendorrecon_db_MatchResults (ID, vendorDocLine_ID, invoiceItem_ID, outcomeCode, amountDelta, matchRuleApplied, businessRole, invoiceNo, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [resultId, headerId, itemId, 'UNMATCHED/PRICE-DIFF', 100, 'RULE_AMOUNT', 'AP', `INV-S21-${po.purchaseOrder}`, 'Invoice amount is higher than S21 PO amount']);

        // 3. Fake Exception
        await db.run(`INSERT INTO vendorrecon_db_Exceptions (ID, matchResult_ID, invoiceNo, outcomeCode, status, recommendedAction, priority, ageInDays, msmeAlert) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [exceptionId, resultId, `INV-S21-${po.purchaseOrder}`, 'UNMATCHED/PRICE-DIFF', 'OPEN', 'Request credit note from vendor or adjust S21 PO price.', i % 2 === 0 ? 'P1' : 'P2', i, i === 0 ? 1 : 0]);
    }

    console.log(`Successfully generated ${pos.length} fake invoices and exceptions for your S21 data!`);
}

seedFakeS21Invoices();
