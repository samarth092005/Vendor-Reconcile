namespace vendorrecon.db;
using { cuid, managed } from '@sap/cds/common';

entity VendorLedgerItems : cuid, managed {
  supplier             : String(10);
  grNumber             : String(20);
  companyCode          : String(4);
  accountingDocument   : String(10);
  documentDate         : Date;
  postingDate          : Date;
  amountInTransCrcy    : Decimal(15,2);
  transactionCurrency  : String(3);
  clearingDocument     : String(10);
  isCleared            : Boolean;
  taxAmount            : Decimal(15,2);
}

entity GrirSnapshot : cuid, managed {
  purchaseOrder        : String(10);
  purchaseOrderItem    : String(5);
  goodsReceiptQty      : Decimal(13,3);
  invoicedQuantity     : Decimal(13,3);
  grirAmount           : Decimal(15,2);
  plant                : String(4);
  supplier             : String(10);
  grNumber             : String(20);
    // SAP QM specific fields
    stockType            : String;
    qualityStatus        : String;
    defectCode           : String;
    inspectorRemarks     : String;
    productImage         : LargeString;
  storageLocation      : String(4);
  batchNumber          : String(20);
  serialNumber         : String(20);
}

entity VendorMaster : cuid, managed {
  businessPartner      : String(10);
  businessPartnerName  : String(80);
  taxNumber1           : String(20);
  paymentTerms         : String(4);
  currency             : String(3);
  pan                  : String(10);
  state                : String(30);
  tdsSection           : String(10);
  isMsme               : Boolean;
  priceTolerancePct    : Decimal(5,2) default 2.00; // New: Configurable tolerance
  qtyTolerancePct      : Decimal(5,2) default 0.00; // New: Configurable tolerance
}

entity VendorInvoiceHeaders : cuid, managed {
  statementUploadId    : UUID;
  uploadHeader         : Association to StatementUploads;
  ingestionSource      : String(20) default 'HANA'; // 'HANA', 'OCR', 'BATCH_UPLOAD'
  vendorInvoiceNo       : String(30);
  invoiceDate           : Date;
  invoiceGrossAmount    : Decimal(15,2);
  currency              : String(3);
  poReference           : String(30);
  paymentReference      : String(30);
  sourceVendorCode      : String(30);
  virtual vendorName    : String(80);
  sourceGstin           : String(30);
  approvedForPayment    : Boolean default false;
  irn                   : String(64);
  irnStatus             : String(20);
  eWayBill              : String(20);
  gstr2bStatus          : String(20);
  placeOfSupply         : String(30);
  unplannedDeliveryCosts: Decimal(15,2) default 0; // New: Freight/Shipping
  paymentStatus         : String(20) default 'UNPAID';
  isCreditMemo          : Boolean default false;
  items                 : Composition of many VendorInvoiceItems on items.header = $self;
}

entity VendorInvoiceItems : cuid, managed {
  header                : Association to VendorInvoiceHeaders;
  itemNo                : String(5);
  material              : String(80);
  poItemReference       : String(5);
  invoicedQty           : Decimal(13,3);
  unitPrice             : Decimal(15,2);
  itemAmount            : Decimal(15,2);
  taxAmount             : Decimal(15,2);
  taxCode               : String(4);
  hsnCode               : String(10);
  gstTdsAmount          : Decimal(15,2);
  uom                   : String(3);
  batchNumber           : String(20);
  serialNumber          : String(20);
  plannedDeliveryCost   : Decimal(15,2);
  unplannedDeliveryCost : Decimal(15,2);
}

entity MatchResults : cuid, managed {
  vendorDocLine    : Association to VendorInvoiceHeaders;
  invoiceItem      : Association to VendorInvoiceItems;
  ledgerItem       : Association to VendorLedgerItems;
  outcomeCode      : String(40);
  amountDelta      : Decimal(15,2);
  matchRuleApplied : String(40);
  businessRole     : String(30);
  invoiceNo        : String(30);
  grNumber         : String(20);
  reason           : String(255);
}
 
entity Exceptions : cuid, managed {
  matchResult      : Association to MatchResults;
  invoiceNo        : String(30);
  poReference      : String(20);
  grNumber         : String(20);
  outcomeCode      : String(40);
  status           : String(20) default 'OPEN';
  recommendedAction : String(500);
  assignedTo       : String(80);
  sbpaInstanceId   : String(60);
  priority         : String(10);
  ageInDays        : Integer;
  msmeAlert        : Boolean;
}

entity AuditLog : cuid, managed {
  entityName     : String(40);
  entityKey      : String(60);
  action         : String(20);
  performedBy    : String(80);
  afterValue     : LargeString;
  performedAt    : Timestamp;
}

entity Users : cuid {
  username     : String(50);
  email        : String(100);
  passwordHash : String(200);
  fullName     : String(100);
  businessRole : String(30);
  vendorCode   : String(10);
}

entity PurchaseRequisitions : cuid, managed {
  prNumber    : String(10);
  material    : String(80);
  qty         : Decimal(13,3);
  amount      : Decimal(15,2);
  status      : String(20) default 'PENDING';
  poReference : String(10);
  indentor    : String(80);
}

entity PurchaseOrders : cuid, managed {
  purchaseOrder : String(10);
  poItem        : String(5);
  poQty         : Decimal(13,3);
  poAmount      : Decimal(15,2);
  supplier      : String(10);
  material      : String(80);
  itemCategory  : String(20) default 'Material'; // New: Material or Service
  status        : String(20) default 'CREATED';
  receivedQty   : Decimal(13,3) default 0;
  poDate        : Date;
  validityEndDate : Date;
  currency      : String(3);
  uom           : String(3);
  storageLocation : String(4);
  deliveryCompleted : Boolean;
  finalInvoiceIndicator : Boolean;
  isDeleted     : Boolean;
  isClosed      : Boolean;
  taxCode       : String(4);
}

entity StatementUploads : cuid, managed {
  vendorCode  : String(10);
  companyCode : String(4);
  period      : String(7); 
  fiscalYear  : String(4); 
  fileName    : String(100);
  status      : String(20) default 'EXTRACTED'; 
  isActive    : Boolean default true;
  invoiceHeaders : Association to many VendorInvoiceHeaders on invoiceHeaders.uploadHeader = $self;
}

entity WorkflowHistory : cuid, managed {
  exceptionID : UUID;
  stepName    : String(50);
  actor       : String(80);
  action      : String(20); 
  comment     : String(500);
  timestamp   : Timestamp;
}

entity Gstr2bInvoices : cuid, managed {
  supplierGstin  : String(15);
  invoiceNumber  : String(16);
  invoiceDate    : Date;
  invoiceAmount  : Decimal(15,2);
  taxAmount      : Decimal(15,2);
  filingStatus   : String(20); 
  filingDate     : Date;
}
