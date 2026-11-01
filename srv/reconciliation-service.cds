using vendorrecon.db as db from '../db/schema';

service ReconciliationService @(path:'/api/v1') {
  @cds.redirection.target
  entity VendorInvoiceHeaders    as projection on db.VendorInvoiceHeaders;
  entity VendorDocLines as projection on db.VendorInvoiceHeaders { *, invoiceGrossAmount as invoiceAmount } excluding { items };
  entity VendorInvoiceItems    as projection on db.VendorInvoiceItems;
  entity VendorLedgerItems as projection on db.VendorLedgerItems;
  entity MatchResults      as projection on db.MatchResults;
  entity Exceptions        as projection on db.Exceptions;
  @readonly entity AuditLog as projection on db.AuditLog;
  entity StatementUploads  as projection on db.StatementUploads;
  entity WorkflowHistory   as projection on db.WorkflowHistory;
  entity Gstr2bInvoices    as projection on db.Gstr2bInvoices;
  entity PurchaseRequisitions as projection on db.PurchaseRequisitions;
  entity PurchaseOrders    as projection on db.PurchaseOrders;
  entity GrirSnapshot      as projection on db.GrirSnapshot;
  entity VendorMaster      as projection on db.VendorMaster;

  // --- Real-Time S21 ERP Sync ---
  action syncWithS21() returns String;

  action seedSapMockData(fileBase64: LargeString) returns String;
  action uploadStatement(fileBase64: String, companyCode: String, period: String, fiscalYear: String, fileName: String) returns String;
  action runMatching(statementUploadId: UUID) returns String;
  action resolveException(exceptionId: UUID, note: String) returns String;
  action reopenException(exceptionId: UUID) returns String;
  action raiseDispute(exceptionId: UUID, comment: String) returns String;
  function getCockpitKpis() returns String;
  action scanInvoiceOcr(imageBase64: LargeString) returns String;

  action register(username: String, email: String, password: String, fullName: String, businessRole: String, vendorCode: String) returns String;
  action login(username: String, password: String) returns String;

  // P2P Actions
  action createPR(material: String, qty: Decimal(13,3), amount: Decimal(15,2)) returns String;
  action approvePR(prId: UUID) returns String;
  action createPO(prId: UUID, purchaseOrder: String, supplier: String) returns String;
  action sendPOToVendor(poId: UUID) returns String;
  action dispatchGoods(poId: UUID) returns String;
  action postGR(poId: UUID, grQty: Decimal(13,3), plant: String, stockType: String, qualityStatus: String, defectCode: String, inspectorRemarks: String, productImage: LargeString) returns String;
  action approveForPayment(docLineId: UUID) returns String;
  action createPaymentProposal(docLineIds: String) returns String;
  action executePaymentRun(paymentRef: String, docLineIds: String) returns String;
}
