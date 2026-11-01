namespace com.acme.vreconc;

using { cuid, managed, sap.common.CodeList, Currency } from '@sap/cds/common';

// -------------------------------------------------------------------
// Code Lists
// -------------------------------------------------------------------

entity MatchTypes : CodeList {
  key code : String(10); // Exact / Tolerance / Manual
}

entity ReconStatuses : CodeList {
  key code : String(20); // Matched / Tolerance / Mismatch / MissingInS4 / MissingInFile / Duplicate / Blocked
  criticality : Integer; // 1 red, 2 yellow, 3 green, 5 informational
}

entity VarianceTypes : CodeList {
  key code : String(10); // Amount / Quantity / Tax / Date / PONumber
}

entity LineStatuses : CodeList {
  key code : String(10); // Matched / Mismatch
  criticality : Integer;
}

entity ExtractionStatuses : CodeList {
  key code : String(15); // Extracted / Failed / PartiallyExtracted
}

entity PostingStatuses : CodeList {
  key code : String(10); // Posted / Parked / Blocked
}

entity LogSteps : CodeList {
  key code : String(20);
  criticality : Integer;
}

entity DocumentTypes : CodeList {
  key code : String(10); // RE / KR / KG / RV
}

// -------------------------------------------------------------------
// Master Data
// -------------------------------------------------------------------

entity Vendors : cuid, managed {
  name        : String(100) not null;
  taxId       : String(30);   // GST / VAT / Tax ID
  country     : String(3);
  companyCode : String(4);
  isBlocked   : Boolean default false;
}

// -------------------------------------------------------------------
// Reconciliation Batch
// -------------------------------------------------------------------

entity ReconciliationRuns : managed {
  key ID                : String(30);        // e.g. RUN-2026-0714-01
  startedAt             : Timestamp;
  completedAt           : Timestamp;
  sourceLocation        : String(255);       // shared drive folder
  batchStatus           : String(20);        // Running / Completed / Failed
  totalInvoices         : Integer;
  autoMatched           : Integer;
  autoMatchedPct        : Decimal(5, 2);
  mismatch              : Integer;
  mismatchPct           : Decimal(5, 2);
  missingInS4           : Integer;
  missingInS4Pct        : Decimal(5, 2);
  missingInFile         : Integer;
  missingInFilePct      : Decimal(5, 2);
  duplicates            : Integer;
  duplicatesPct         : Decimal(5, 2);
  highValueExceptions   : Integer;
  blocked               : Integer;
  blockedPct            : Decimal(5, 2);
  avgProcessingSecs     : Decimal(5, 2);
  ocrAccuracyPct        : Decimal(5, 2);
  // Deltas vs previous run (drive "+12% vs last run" indicators)
  totalDeltaPct         : Decimal(5, 2);
  autoMatchedDeltaPct   : Decimal(5, 2);
  mismatchDeltaPct      : Decimal(5, 2);
  missingInS4DeltaPct   : Decimal(5, 2);
  missingInFileDeltaPct : Decimal(5, 2);
  duplicatesDeltaPct    : Decimal(5, 2);
  highValueDelta        : Integer;
  blockedDelta          : Integer;
  avgProcessingDelta    : Decimal(5, 2);
  ocrAccuracyDeltaPct   : Decimal(5, 2);

  results : Association to many ReconciliationResults on results.run = $self;
}

// -------------------------------------------------------------------
// Invoice Extract (from OCR / shared drive)
// -------------------------------------------------------------------

entity InvoiceExtracts : cuid, managed {
  run                : Association to ReconciliationRuns;
  vendor             : Association to Vendors;
  fileName           : String(255);
  fileTimestamp      : Timestamp;
  invoiceNumberFile  : String(30);
  invoiceDate        : Date;
  dueDate            : Date;
  poNumber           : String(20);
  grNumber           : String(20);
  netAmount          : Decimal(15, 2);
  taxAmount          : Decimal(15, 2);
  grossAmount        : Decimal(15, 2);
  currency           : Currency;
  paymentTerms       : String(10);
  bankRef            : String(30);
  ocrConfidence      : Decimal(5, 2);
  extractionStatus   : Association to ExtractionStatuses;

  lines : Composition of many InvoiceExtractLines on lines.parent = $self;
}

entity InvoiceExtractLines : cuid {
  parent      : Association to InvoiceExtracts;
  lineNo      : Integer;
  description : String(255);
  qty         : Decimal(13, 3);
  unitPrice   : Decimal(15, 2);
  netAmount   : Decimal(15, 2);
}

// -------------------------------------------------------------------
// SAP S/4HANA Posted Invoice
// -------------------------------------------------------------------

entity SAPInvoices : cuid, managed {
  invoiceNumberS4     : String(15);   // e.g. 5100000287
  vendor              : Association to Vendors;
  companyCode         : String(4);
  invoiceDate         : Date;
  postingDate         : Date;
  fiscalYear          : Integer;
  fiscalPeriod        : Integer;
  poNumber            : String(20);
  netAmount           : Decimal(15, 2);
  taxAmount           : Decimal(15, 2);
  grossAmount         : Decimal(15, 2);
  currency            : Currency;
  documentType        : Association to DocumentTypes;
  postingStatus       : Association to PostingStatuses;
  paymentBlockStatus  : String(10);   // Blocked / Released
  clearedStatus       : String(10);   // Open / Cleared

  lines : Composition of many SAPInvoiceLines on lines.parent = $self;
}

entity SAPInvoiceLines : cuid {
  parent      : Association to SAPInvoices;
  lineNo      : Integer;
  description : String(255);
  qty         : Decimal(13, 3);
  unitPrice   : Decimal(15, 2);
  netAmount   : Decimal(15, 2);
}

// -------------------------------------------------------------------
// Reconciliation Result (primary ALP entity)
// -------------------------------------------------------------------

entity ReconciliationResults : cuid, managed {
  run                  : Association to ReconciliationRuns;
  vendor               : Association to Vendors;
  invoiceExtract       : Association to InvoiceExtracts;
  sapInvoice           : Association to SAPInvoices;

  // Denormalised for ALP table rendering (matches screenshot 2 columns)
  sourceFile           : String(255);
  invNumberFile        : String(30);
  invNumberS4          : String(15);
  invDate              : Date;
  postDate             : Date;
  poNumber             : String(20);
  grNumber             : String(20);
  fileGross            : Decimal(15, 2);
  s4Gross              : Decimal(15, 2);
  varianceAmount       : Decimal(15, 2);
  variancePct          : Decimal(6, 2);
  currency             : Currency;
  matchType            : Association to MatchTypes;
  exceptionReason      : String(255);
  status               : Association to ReconStatuses;

  // Object-page header comparison extras
  toleranceThreshold   : Decimal(5, 2) default 2.00;
  withinTolerance      : Boolean;
  ocrConfidence        : Decimal(5, 2);

  // AI / Automation indicators
  suggestedConfidence  : Decimal(5, 2);
  predictedCategory    : String(50);
  resolverGroup        : String(50);
  autoResolveEligible  : Boolean;

  // Workflow
  assignedTo           : String(60);
  lastUpdatedAt        : Timestamp;

  // Filter helpers
  companyCode          : String(4);
  documentType         : Association to DocumentTypes;
  fiscalPeriod         : Integer;
  fiscalYear           : Integer;

  // Virtual: criticality (computed in service handler for ObjectStatus colors)
  virtual criticality  : Integer;

  lineComparisons : Composition of many LineItemComparisons on lineComparisons.parent = $self;
  variances       : Composition of many VarianceDetails    on variances.result       = $self;
  logs            : Composition of many ProcessingLogs     on logs.result            = $self;
  audit           : Composition of many WorkflowAudits     on audit.result           = $self;
  exceptions      : Composition of many ExceptionCases     on exceptions.result      = $self;
}

// -------------------------------------------------------------------
// Line-Item Comparison Matrix (Object Page)
// -------------------------------------------------------------------

entity LineItemComparisons : cuid {
  parent       : Association to ReconciliationResults;
  lineNo       : Integer;
  description  : String(255);
  qtyFile      : Decimal(13, 3);
  qtyS4        : Decimal(13, 3);
  priceFile    : Decimal(15, 2);
  priceS4      : Decimal(15, 2);
  netFile      : Decimal(15, 2);
  netS4        : Decimal(15, 2);
  lineStatus   : Association to LineStatuses;
  virtual criticality : Integer;
}

// -------------------------------------------------------------------
// Variance Breakdown (stacked column chart)
// -------------------------------------------------------------------

entity VarianceDetails : cuid {
  result   : Association to ReconciliationResults;
  type     : Association to VarianceTypes;
  severity : String(15);  // matched / tolerance / mismatch
  delta    : Decimal(15, 2);
  count    : Integer default 1;
}

// -------------------------------------------------------------------
// Exception Case (worklist)
// -------------------------------------------------------------------

entity ExceptionCases : cuid, managed {
  result      : Association to ReconciliationResults;
  openedAt    : Timestamp;
  assignedTo  : String(60);
  resolution  : String(40);
  notes       : String(500);
}

// -------------------------------------------------------------------
// Processing Log (Object Page)
// -------------------------------------------------------------------

entity ProcessingLogs : cuid {
  result   : Association to ReconciliationResults;
  stepAt   : Timestamp;
  stepName : Association to LogSteps;
  status   : String(15);   // Success / Warning / Failed
  detail   : String(500);
  virtual criticality : Integer;
}

// -------------------------------------------------------------------
// Workflow / Audit Trail
// -------------------------------------------------------------------

entity WorkflowAudits : cuid {
  result   : Association to ReconciliationResults;
  actor    : String(60);
  actedAt  : Timestamp;
  action   : String(60);
  note     : String(255);
}
