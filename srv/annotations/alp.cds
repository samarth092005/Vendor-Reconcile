using ReconService from '../recon-service';

////////////////////////////////////////////////////////////////////////
// ReconciliationResults — Analytical List Page
////////////////////////////////////////////////////////////////////////

annotate ReconService.ReconciliationResults with @(
  Common.SemanticKey     : [ID],
  UI.HeaderInfo          : {
    TypeName      : 'Invoice',
    TypeNamePlural: 'Invoices',
    Title         : { Value: invNumberFile },
    Description   : { Value: vendor.name }
  },

  // ------------- Filter Bar --------------------------------------
  UI.SelectionFields     : [
    run_ID,
    vendor_ID,
    invDate,
    postDate,
    fiscalPeriod,
    currency_code,
    status_code,
    matchType_code,
    documentType_code,
    companyCode,
    poNumber,
    grNumber,
    toleranceThreshold
  ],

  // ------------- Line-Item Table (18 columns) --------------------
  UI.LineItem : [
    { $Type: 'UI.DataField',       Value: run_ID,          Label: 'Run ID' },
    { $Type: 'UI.DataField',       Value: sourceFile,      Label: 'Source File' },
    { $Type: 'UI.DataField',       Value: vendor.name,     Label: 'Vendor' },
    { $Type: 'UI.DataField',       Value: invNumberFile,   Label: 'Inv # (File)' },
    { $Type: 'UI.DataField',       Value: invNumberS4,     Label: 'Inv # (S/4)' },
    { $Type: 'UI.DataField',       Value: invDate,         Label: 'Inv Date' },
    { $Type: 'UI.DataField',       Value: postDate,        Label: 'Post Date' },
    { $Type: 'UI.DataField',       Value: poNumber,        Label: 'PO #' },
    { $Type: 'UI.DataField',       Value: fileGross,       Label: 'File Gross' },
    { $Type: 'UI.DataField',       Value: s4Gross,         Label: 'S/4 Gross' },
    { $Type: 'UI.DataField',       Value: varianceAmount,  Label: 'Variance',
      Criticality: criticality },
    { $Type: 'UI.DataField',       Value: variancePct,     Label: 'Var %',
      Criticality: criticality },
    { $Type: 'UI.DataField',       Value: matchType_code,  Label: 'Match Type' },
    { $Type: 'UI.DataField',       Value: exceptionReason, Label: 'Exception Reason' },
    { $Type: 'UI.DataField',       Value: status.name,     Label: 'Status',
      Criticality: criticality,
      CriticalityRepresentation: #WithoutIcon },
    { $Type: 'UI.DataField',       Value: assignedTo,      Label: 'Assigned To' },
    { $Type: 'UI.DataField',       Value: lastUpdatedAt,   Label: 'Last Updated' },
    { $Type: 'UI.DataFieldForAction', Label: 'Accept',
      Action: 'ReconService.acceptMatch',
      InvocationGrouping: #Isolated }
  ],

  UI.PresentationVariant : {
    SortOrder: [{ Property: lastUpdatedAt, Descending: true }],
    Visualizations: ['@UI.LineItem']
  },

  // ------------- Field-level annotations --------------------------
  UI.DataPoint#Variance  : {
    Value: varianceAmount,
    Title: 'Variance Amount',
    Criticality: criticality
  }
);

// Field-level semantics
annotate ReconService.ReconciliationResults with {
  run           @Common.Label: 'Run ID';
  vendor        @Common.Label: 'Vendor';
  sourceFile    @Common.Label: 'Source File';
  invNumberFile @Common.Label: 'Invoice # (File)';
  invNumberS4   @Common.Label: 'Invoice # (S/4)';
  invDate       @Common.Label: 'Invoice Date';
  postDate      @Common.Label: 'Posting Date';
  poNumber      @Common.Label: 'PO Number';
  grNumber      @Common.Label: 'GR Number';
  fileGross     @Common.Label: 'File Gross Amount' @Measures.ISOCurrency: currency_code;
  s4Gross       @Common.Label: 'S/4 Gross Amount'  @Measures.ISOCurrency: currency_code;
  varianceAmount @Common.Label: 'Variance Amount'  @Measures.ISOCurrency: currency_code;
  variancePct   @Common.Label: 'Variance %';
  matchType     @Common.Label: 'Match Type';
  status        @Common.Label: 'Status';
  companyCode   @Common.Label: 'Company Code';
  documentType  @Common.Label: 'Document Type';
  toleranceThreshold @Common.Label: 'Tolerance %';
};

////////////////////////////////////////////////////////////////////////
// KPI Cards (10 tiles)
////////////////////////////////////////////////////////////////////////

annotate ReconService.KPIOverview with @(
  UI.Chart#dummy : {
    ChartType: #Column,
    Measures: [totalInvoices],
    Dimensions: [run_ID]
  },
  UI.DataPoint#TotalInvoices : {
    Value: totalInvoices,
    Title: 'Total Invoices Processed',
    Description: 'This run',
    TrendCalculation: {
      ReferenceValue: totalDeltaPct,
      UpDifference: 1,
      DownDifference: -1
    }
  },
  UI.DataPoint#AutoMatched : {
    Value: autoMatched,
    Title: 'Auto-Matched Invoices',
    Description: '% of total',
    Criticality: #Positive,
    TrendCalculation: {
      ReferenceValue: autoMatchedDeltaPct,
      UpDifference: 1,
      DownDifference: -1
    }
  },
  UI.DataPoint#Mismatch : {
    Value: mismatch,
    Title: 'Mismatch Invoices',
    Description: '% of total',
    Criticality: #Negative,
    TrendCalculation: {
      ReferenceValue: mismatchDeltaPct,
      UpDifference: 1,
      DownDifference: -1
    }
  },
  UI.DataPoint#MissingInS4 : {
    Value: missingInS4,
    Title: 'Missing in SAP S/4HANA',
    Description: '% of total',
    Criticality: #Critical
  },
  UI.DataPoint#MissingInFile : {
    Value: missingInFile,
    Title: 'Missing in Shared Drive',
    Description: '% of total',
    Criticality: #Critical
  },
  UI.DataPoint#Duplicates : {
    Value: duplicates,
    Title: 'Duplicate Suspects',
    Description: '% of total',
    Criticality: #Critical
  },
  UI.DataPoint#HighValue : {
    Value: highValueExceptions,
    Title: 'High-Value Exceptions',
    Description: 'Above $50K',
    Criticality: #Negative
  },
  UI.DataPoint#Blocked : {
    Value: blocked,
    Title: 'Blocked Invoices',
    Description: '% of total',
    Criticality: #Negative
  },
  UI.DataPoint#AvgProcessing : {
    Value: avgProcessingSecs,
    Title: 'Avg Processing Time',
    Description: 'seconds / invoice'
  },
  UI.DataPoint#OcrAccuracy : {
    Value: ocrAccuracyPct,
    Title: 'OCR Extraction Accuracy',
    Description: '%',
    Criticality: #Positive
  }
);

////////////////////////////////////////////////////////////////////////
// Charts
////////////////////////////////////////////////////////////////////////

// Reconciliation Status Distribution — Donut
annotate ReconService.ReconStatusDistribution with @(
  Aggregation.default: #SUM,
  UI.Chart#StatusDonut : {
    Title: 'Reconciliation Status Distribution',
    ChartType: #Donut,
    Dimensions: [status_code],
    DimensionAttributes: [
      { Dimension: status_code, Role: #Category }
    ],
    Measures: [invoiceCount],
    MeasureAttributes: [
      { Measure: invoiceCount, Role: #Axis1 }
    ]
  }
) {
  invoiceCount @Analytics.Measure @Aggregation.default: #SUM;
  status_code  @Analytics.Dimension;
};

// Mismatch by Vendor — Horizontal Bar (Top 10)
annotate ReconService.MismatchByVendorTop10 with @(
  UI.Chart#MismatchBar : {
    Title: 'Mismatch by Vendor — Top 10',
    ChartType: #Bar,
    Dimensions: [vendorName],
    DimensionAttributes: [
      { Dimension: vendorName, Role: #Category }
    ],
    Measures: [mismatchCount],
    MeasureAttributes: [
      { Measure: mismatchCount, Role: #Axis1 }
    ]
  },
  UI.PresentationVariant#Top10 : {
    MaxItems: 10,
    SortOrder: [{ Property: mismatchCount, Descending: true }],
    Visualizations: ['@UI.Chart#MismatchBar']
  }
) {
  mismatchCount @Analytics.Measure @Aggregation.default: #SUM;
  vendorName    @Analytics.Dimension;
};

// Daily Reconciliation Trend — Line
annotate ReconService.DailyReconTrend with @(
  UI.Chart#TrendLine : {
    Title: 'Daily Reconciliation Trend',
    ChartType: #Line,
    Dimensions: [day, status_code],
    DimensionAttributes: [
      { Dimension: day, Role: #Category },
      { Dimension: status_code, Role: #Series }
    ],
    Measures: [invoiceCount],
    MeasureAttributes: [
      { Measure: invoiceCount, Role: #Axis1 }
    ]
  }
) {
  invoiceCount @Analytics.Measure @Aggregation.default: #SUM;
  day          @Analytics.Dimension;
  status_code  @Analytics.Dimension;
};

// Variance Type Breakdown — Stacked Column
annotate ReconService.VarianceTypeBreakdown with @(
  UI.Chart#VarianceStacked : {
    Title: 'Variance Type Breakdown',
    ChartType: #Column,
    Dimensions: [varianceType_code, severity],
    DimensionAttributes: [
      { Dimension: varianceType_code, Role: #Category },
      { Dimension: severity, Role: #Series }
    ],
    Measures: [invoiceCount],
    MeasureAttributes: [
      { Measure: invoiceCount, Role: #Axis1 }
    ]
  }
) {
  invoiceCount      @Analytics.Measure @Aggregation.default: #SUM;
  varianceType_code @Analytics.Dimension;
  severity          @Analytics.Dimension;
};
