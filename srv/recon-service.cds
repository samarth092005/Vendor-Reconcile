using { com.acme.vreconc as vr } from '../db/mohit-schema';

@path: '/recon'
service ReconService {

  // ------------- Master & Reference ------------------------------

  @readonly entity Vendors            as projection on vr.Vendors;
  @readonly entity MatchTypes         as projection on vr.MatchTypes;
  @readonly entity ReconStatuses      as projection on vr.ReconStatuses;
  @readonly entity VarianceTypes      as projection on vr.VarianceTypes;
  @readonly entity LineStatuses       as projection on vr.LineStatuses;
  @readonly entity ExtractionStatuses as projection on vr.ExtractionStatuses;
  @readonly entity PostingStatuses    as projection on vr.PostingStatuses;
  @readonly entity LogSteps           as projection on vr.LogSteps;
  @readonly entity DocumentTypes      as projection on vr.DocumentTypes;

  // ------------- Runs --------------------------------------------

  @readonly
  @cds.redirection.target
  entity ReconciliationRuns as projection on vr.ReconciliationRuns;

  // ------------- Source & Target invoices ------------------------

  @readonly entity InvoiceExtracts as projection on vr.InvoiceExtracts;
  @readonly entity SAPInvoices     as projection on vr.SAPInvoices;

  // ------------- Primary ALP entity ------------------------------

  @odata.draft.enabled: false
  @cds.redirection.target
  entity ReconciliationResults as projection on vr.ReconciliationResults actions {

    @Common.SideEffects: { TargetProperties: ['in/status_code', 'in/lastUpdatedAt'] }
    action acceptMatch()                          returns ReconciliationResults;

    @Common.SideEffects: { TargetProperties: ['in/status_code', 'in/lastUpdatedAt'] }
    action rejectMatch(reason: String(255))        returns ReconciliationResults;

    @Common.SideEffects: { TargetProperties: ['in/status_code', 'in/assignedTo', 'in/lastUpdatedAt'] }
    action escalate(toGroup: String(50))           returns ReconciliationResults;

    @Common.SideEffects: { TargetProperties: ['in/status_code', 'in/exceptionReason', 'in/lastUpdatedAt'] }
    action createDispute(note: String(500))        returns ReconciliationResults;
  };

  @readonly entity LineItemComparisons as projection on vr.LineItemComparisons {
    *,
    case lineStatus.code
      when 'Matched'  then 3
      when 'Mismatch' then 1
      else 5
    end as criticality : Integer
  };

  @readonly
  @cds.redirection.target
  entity VarianceDetails     as projection on vr.VarianceDetails;

  @readonly entity ProcessingLogs      as projection on vr.ProcessingLogs {
    *,
    case status
      when 'Success' then 3
      when 'Warning' then 2
      when 'Failed'  then 1
      else 5
    end as criticality : Integer
  };

  @readonly entity WorkflowAudits      as projection on vr.WorkflowAudits;
            entity ExceptionCases      as projection on vr.ExceptionCases;

  // ------------- Analytical views (KPI + Charts) -----------------

  @readonly
  @cds.redirection.target: false
  @Aggregation.ApplySupported: {
    Transformations: ['aggregate', 'groupby', 'filter', 'top', 'skip', 'orderby'],
    Rollup: #None
  }
  entity KPIOverview as
    select from vr.ReconciliationRuns {
      key ID as run_ID,
      totalInvoices,
      autoMatched,
      autoMatchedPct,
      mismatch,
      mismatchPct,
      missingInS4,
      missingInS4Pct,
      missingInFile,
      missingInFilePct,
      duplicates,
      duplicatesPct,
      highValueExceptions,
      blocked,
      blockedPct,
      avgProcessingSecs,
      ocrAccuracyPct,
      totalDeltaPct,
      autoMatchedDeltaPct,
      mismatchDeltaPct,
      missingInS4DeltaPct,
      missingInFileDeltaPct,
      duplicatesDeltaPct,
      highValueDelta,
      blockedDelta,
      avgProcessingDelta,
      ocrAccuracyDeltaPct,
      completedAt
    };

  @readonly
  @cds.redirection.target: false
  entity ReconStatusDistribution as
    select from vr.ReconciliationResults {
      key run.ID as run_ID,
      key status.code as status_code,
      status.name as status_name,
      status.criticality as criticality,
      count(*) as invoiceCount : Integer
    } group by run.ID, status.code, status.name, status.criticality;

  @readonly
  @cds.redirection.target: false
  entity MismatchByVendorTop10 as
    select from vr.ReconciliationResults {
      key run.ID as run_ID,
      key vendor.ID as vendor_ID,
      vendor.name as vendorName,
      count(*) as mismatchCount : Integer
    } where status.code in ('Mismatch', 'MissingInS4', 'MissingInFile')
      group by run.ID, vendor.ID, vendor.name;

  @readonly
  @cds.redirection.target: false
  entity DailyReconTrend as
    select from vr.ReconciliationResults {
      key run.ID as run_ID,
      key invDate as day,
      key status.code as status_code,
      count(*) as invoiceCount : Integer
    } group by run.ID, invDate, status.code;

  @readonly
  @cds.redirection.target: false
  entity VarianceTypeBreakdown as
    select from vr.VarianceDetails {
      key type.code as varianceType_code,
      type.name as varianceType_name,
      key severity,
      sum(count) as invoiceCount : Integer
    } group by type.code, type.name, severity;

  // ------------- Actions on the service --------------------------

  action triggerRun(sourceLocation: String) returns ReconciliationRuns;
}
