const fs = require('fs');
const crypto = require('crypto');
function uuid() { return crypto.randomUUID(); }
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

let pos = [];
let grirs = [];
let invoices = [];
let invoiceItems = [];
let exceptions = [];

for (let i = 1; i <= 60; i++) {
    let poNo = `45000${12345 + i}`;
    let vend = `V-10${rnd(10, 99)}`;
    let qty = rnd(10, 500);
    let amount = qty * rnd(10, 50);
    
    // Status distribution
    let status = 'CREATED';
    let rQty = 0;
    if (i % 3 === 0) { status = 'SENT'; } 
    else if (i % 3 === 1) { status = 'GR_POSTED'; rQty = qty; }
    else { status = 'DISPATCHED'; rQty = Math.floor(qty / 2); }

    let poId = uuid();
    pos.push(`${poId},${poNo},10,${qty},${amount},${vend},Mock Material ${i},Material,${status},${rQty}`);

    if (status === 'GR_POSTED') {
        let grAmount = amount;
        grirs.push(`${uuid()},${poNo},10,${qty},${qty},${grAmount},1000,${vend},GR-${1000+i},Unrestricted,Approved,,,`);
        
        let invNo = `INV-2026-${rnd(1000, 9999)}`;
        let invId = uuid();
        invoices.push(`${invId},,${invNo},2026-10-06,${grAmount},USD,${poNo},PAY-${i},${vend},GSTIN${vend},false,IRN${invId},Active,,MATCHED,Pune,0,UNPAID`);
        invoiceItems.push(`${uuid()},${invId},10,10,Mock Material ${i},${qty},${grAmount},IGST`);
        
        // Sometimes create exceptions
        if (i % 5 === 0) {
            exceptions.push(`${uuid()},${uuid()},CASE-${i},${vend},${invNo},${grAmount},USD,PRICE_MISMATCH,High,Pending,,`)
        }
    }
}

fs.writeFileSync('db/data/vendorrecon.db-PurchaseOrders.csv', 'ID,purchaseOrder,poItem,poQty,poAmount,supplier,material,itemCategory,status,receivedQty\n' + pos.join('\n'));
fs.writeFileSync('db/data/vendorrecon.db-GrirSnapshot.csv', 'ID,purchaseOrder,purchaseOrderItem,goodsReceiptQty,invoicedQuantity,grirAmount,plant,supplier,grNumber,stockType,qualityStatus,defectCode,inspectorRemarks,productImage\n' + grirs.join('\n'));
fs.writeFileSync('db/data/vendorrecon.db-VendorInvoiceHeaders.csv', 'ID,statementUploadId,vendorInvoiceNo,invoiceDate,invoiceGrossAmount,currency,poReference,paymentReference,sourceVendorCode,sourceGstin,approvedForPayment,irn,irnStatus,eWayBill,gstr2bStatus,placeOfSupply,unplannedDeliveryCosts,paymentStatus\n' + invoices.join('\n'));
fs.writeFileSync('db/data/vendorrecon.db-VendorInvoiceItems.csv', 'ID,header_ID,itemNo,poItemReference,material,invoicedQty,itemAmount,taxCode\n' + invoiceItems.join('\n'));
fs.writeFileSync('db/data/com.acme.vreconc-ExceptionCases.csv', 'ID,run_ID,caseId,vendor_ID,invoiceNumber,invoiceAmount,currency_code,varianceCategory,priority,status,createdAt,resolvedAt\n' + exceptions.join('\n'));

console.log("Mock data generated.");
