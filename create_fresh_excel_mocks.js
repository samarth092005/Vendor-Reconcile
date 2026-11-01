const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// --- 1. Fresh_Vendor_Statement.xlsx ---
const statementWb = XLSX.utils.book_new();
const statementData = [
  ['VendorCode', 'VendorInvoiceNo', 'InvoiceDate', 'InvoiceAmount', 'Currency', 'PoReference', 'GstTdsAmount', 'PaymentReference', 'Gstin', 'Irn', 'IrnStatus', 'EwayBill', 'Gstr2bStatus'],
  // Exact Match
  ['V-1001', 'INV-22475', '2026-04-16', 89208, 'INR', '4501220051', 9558, 'PAY005', '27AAACS1210B1Z5', 'IRN-773121X88', 'Generated', 'EWB-202604169', '2B Matched'],
  // Qty Less
  ['V-1001', 'INV-22490', '2026-04-20', 339250, 'INR', '4501220062', 51750, 'PAY006', '27AAACS1210B1Z5', 'IRN-990123A88', 'Generated', 'EWB-202604201', '2B Matched'],
  // Qty More
  ['V-1001', 'INV-22418', '2026-04-02', 1469100, 'INR', '4501220001', 224100, 'PAY001', '27AAACS1210B1Z5', 'IRN-998218A98', 'Generated', 'EWB-202604021', '2B Matched'],
  // Price High
  ['V-1001', 'INV-22440', '2026-04-09', 386656.50, 'INR', '4501220040', 58981.50, null, '27AAACS1210B1Z5', 'IRN-881275C22', 'Generated', 'EWB-202604092', '2B Matched'],
  // Missing GR
  ['V-1001', 'INV-22461', '2026-04-14', 247800, 'INR', '4501220033', 37800, null, '27AAACS1210B1Z5', 'IRN-449108E11', 'Generated', 'EWB-202604143', '2B Matched'],
  // GST 2B Gap
  ['V-1001', 'INV-22482', '2026-04-18', 9912, 'INR', '4501220051', 1062, null, '27AAACS1210B1Z5', '', 'NOT generated', '', '2B Gap'],
  // TDS Deducted
  ['V-1001', 'TDS deducted', '2026-04-25', -1469, 'INR', null, 0, null, '27AAACS1210B1Z5', '', '', '', ''],
  // Payment Transit
  ['V-1001', 'Payment UTR-88214', '2026-04-25', -1000000, 'INR', null, 0, 'UTR-88214', '27AAACS1210B1Z5', '', '', '', ''],
  // Credit Note Missing
  ['V-1001', 'CN-0091', '2026-04-11', -14160, 'INR', '4501220040', -2160, null, '27AAACS1210B1Z5', 'IRN-CN77123A', 'Generated', '', '2B Matched'],
  // FX Revaluation
  ['V-1001', 'HX-2026-07', '2026-04-12', 17000, 'USD', '4501220075', 0, 'PAY007', '—', '—', '—', '—', '']
];
const statementWs = XLSX.utils.aoa_to_sheet(statementData);
XLSX.utils.book_append_sheet(statementWb, statementWs, "Statement");
XLSX.writeFile(statementWb, path.join(__dirname, 'Fresh_Vendor_Statement.xlsx'));

// --- 2. Fresh_SAP_Ledger.xlsx ---
const ledgerWb = XLSX.utils.book_new();

// VendorMaster
const vendorMasterData = [
  ['BusinessPartner', 'BusinessPartnerName', 'TaxNumber1', 'PaymentTerms', 'Currency', 'Pan', 'State', 'TdsSection', 'IsMsme'],
  ['V-1001', 'Sigma Components Pvt Ltd', '27AAACS1210B1Z5', 'NT30', 'INR', 'AAACS1210B', 'Maharashtra', '194Q', 'No']
];
XLSX.utils.book_append_sheet(ledgerWb, XLSX.utils.aoa_to_sheet(vendorMasterData), "VendorMaster");

// GrirSnapshot
const grirData = [
  ['PurchaseOrder', 'PurchaseOrderItem', 'GoodsReceiptQty', 'InvoicedQuantity', 'GrirAmount', 'Plant', 'Supplier'],
  ['4501220051', '10', 1000, 1000, 88500, '1000', 'V-1001'],
  ['4501220062', '10', 280, 300, 287500, '1000', 'V-1001'],
  ['4501220001', '10', 450, 500, 1120500, '1000', 'V-1001'],
  ['4501220040', '10', 200, 200, 321250, '1000', 'V-1001'],
  ['4501220033', '10', 0, 120, 0, '1000', 'V-1001'],
  ['4501220075', '10', 20, 20, 17000, '1000', 'V-1001']
];
XLSX.utils.book_append_sheet(ledgerWb, XLSX.utils.aoa_to_sheet(grirData), "GrirSnapshot");

// VendorLedgerItems
const vendorLedgerData = [
  ['Supplier', 'CompanyCode', 'AccountingDocument', 'DocumentDate', 'PostingDate', 'AmountInTransCrcy', 'TransactionCurrency', 'ClearingDocument', 'TaxAmount'],
  ['V-1001', '1000', '4501220051', '2026-04-16', '2026-04-16', 89208, 'INR', 'PAY005', 9558],
  ['V-1001', '1000', '4501220062', '2026-04-20', '2026-04-20', 339250, 'INR', 'PAY006', 51750],
  ['V-1001', '1000', '4501220001', '2026-04-02', '2026-04-02', 1469100, 'INR', 'PAY001', 224100],
  ['V-1001', '1000', '4501220040', '2026-04-09', '2026-04-09', 386656.50, 'INR', null, 58981.50],
  ['V-1001', '1000', '4501220051', '2026-04-18', '2026-04-18', 9912, 'INR', null, 1062],
  ['V-1001', '1000', 'TDS-194Q', '2026-04-25', '2026-04-25', -1469, 'INR', 'PAY004', 0],
  ['V-1001', '1000', 'PAY-UTR88214', '2026-04-28', '2026-04-28', -1000000, 'INR', 'PAY003', 0],
  ['V-1001', '1000', '4501220040', '2026-04-09', '2026-04-09', 386656.50, 'INR', null, 58981.50],
  ['V-1001', '1000', 'HX-2026-07', '2026-04-12', '2026-04-12', 17000, 'USD', 'PAY007', 0]
];
XLSX.utils.book_append_sheet(ledgerWb, XLSX.utils.aoa_to_sheet(vendorLedgerData), "VendorLedgerItems");

// PurchaseOrders
const purchaseOrderData = [
  ['PurchaseOrder', 'PoItem', 'PoQty', 'PoAmount', 'Supplier'],
  ['4501220051', '10', 1000, 88500, 'V-1001'],
  ['4501220062', '10', 300, 287500, 'V-1001'],
  ['4501220001', '10', 500, 1245000, 'V-1001'],
  ['4501220040', '10', 200, 321250, 'V-1001'],
  ['4501220033', '10', 120, 210000, 'V-1001'],
  ['4501220075', '10', 20, 17000, 'V-1001']
];
XLSX.utils.book_append_sheet(ledgerWb, XLSX.utils.aoa_to_sheet(purchaseOrderData), "PurchaseOrders");

XLSX.writeFile(ledgerWb, path.join(__dirname, 'Fresh_SAP_Ledger.xlsx'));

console.log("Successfully generated Fresh_Vendor_Statement.xlsx and Fresh_SAP_Ledger.xlsx");
