using ReconService from '../recon-service';

////////////////////////////////////////////////////////////////////////
// Object Page for ReconciliationResults — mirrors screenshots 3 & 4
////////////////////////////////////////////////////////////////////////

annotate ReconService.ReconciliationResults with @(

  // ------------- Facets (Object Page sections) -------------------
  UI.Facets : [
    { $Type: 'UI.CollectionFacet', ID: 'AIIndicators',
      Label: 'AI / Automation Indicators',
      Facets: [
        { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#AIIndicators' }
      ]
    },
    { $Type: 'UI.CollectionFacet', ID: 'HeaderComparison',
      Label: 'Header Comparison — File vs SAP S/4HANA',
      Facets: [
        { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#HeaderFile', Label: 'From File (OCR)' },
        { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#HeaderS4',   Label: 'SAP S/4HANA' }
      ]
    },
    { $Type: 'UI.ReferenceFacet', ID: 'VarianceBreakdown',
      Label: 'Variance Breakdown',
      Target: '@UI.FieldGroup#Variance'
    },
    { $Type: 'UI.ReferenceFacet', ID: 'LineItems',
      Label: 'Line-Item Comparison Matrix',
      Target: 'lineComparisons/@UI.LineItem'
    },
    { $Type: 'UI.ReferenceFacet', ID: 'DocumentPreview',
      Label: 'Document Preview',
      Target: '@UI.FieldGroup#DocumentPreview'
    },
    { $Type: 'UI.ReferenceFacet', ID: 'ProcessingLogs',
      Label: 'Processing Logs (OCR + Integration)',
      Target: 'logs/@UI.LineItem'
    },
    { $Type: 'UI.ReferenceFacet', ID: 'AuditTrail',
      Label: 'Workflow / Audit Trail',
      Target: 'audit/@UI.LineItem'
    },
    { $Type: 'UI.ReferenceFacet', ID: 'RecommendedActions',
      Label: 'Recommended Actions',
      Target: '@UI.FieldGroup#RecommendedActions'
    }
  ],

  // ------------- Field Groups -----------------------------------

  UI.FieldGroup#AIIndicators : { Data: [
    { $Type: 'UI.DataFieldWithUrl', Label: 'Suggested Match Confidence',
      Value: suggestedConfidence, Url: '#' },
    { $Type: 'UI.DataField', Label: 'Predicted Exception Category', Value: predictedCategory },
    { $Type: 'UI.DataField', Label: 'Recommended Resolver Group',   Value: resolverGroup },
    { $Type: 'UI.DataField', Label: 'Auto-Resolution Eligibility',  Value: autoResolveEligible }
  ]},

  UI.FieldGroup#HeaderFile : { Data: [
    { $Type: 'UI.DataField', Label: 'Vendor',         Value: vendor.name },
    { $Type: 'UI.DataField', Label: 'Invoice Number', Value: invNumberFile },
    { $Type: 'UI.DataField', Label: 'Invoice Date',   Value: invDate },
    { $Type: 'UI.DataField', Label: 'Posting Date',   Value: postDate },
    { $Type: 'UI.DataField', Label: 'PO Number',      Value: poNumber },
    { $Type: 'UI.DataField', Label: 'Gross Amount',   Value: fileGross },
    { $Type: 'UI.DataField', Label: 'Variance Amount', Value: varianceAmount, Criticality: criticality },
    { $Type: 'UI.DataField', Label: 'Match Type',    Value: matchType_code },
    { $Type: 'UI.DataField', Label: 'OCR Confidence', Value: ocrConfidence }
  ]},

  UI.FieldGroup#HeaderS4 : { Data: [
    { $Type: 'UI.DataField', Label: 'Vendor',         Value: vendor.name },
    { $Type: 'UI.DataField', Label: 'Invoice Number', Value: invNumberS4 },
    { $Type: 'UI.DataField', Label: 'Invoice Date',   Value: invDate },
    { $Type: 'UI.DataField', Label: 'Posting Date',   Value: postDate },
    { $Type: 'UI.DataField', Label: 'PO Number',      Value: poNumber },
    { $Type: 'UI.DataField', Label: 'Gross Amount',   Value: s4Gross },
    { $Type: 'UI.DataField', Label: 'Variance Amount', Value: varianceAmount, Criticality: criticality },
    { $Type: 'UI.DataField', Label: 'Match Type',    Value: matchType_code }
  ]},

  UI.FieldGroup#Variance : { Data: [
    { $Type: 'UI.DataField', Label: 'Amount Variance',      Value: varianceAmount, Criticality: criticality },
    { $Type: 'UI.DataField', Label: 'Variance %',            Value: variancePct,    Criticality: criticality },
    { $Type: 'UI.DataField', Label: 'Tolerance Threshold',   Value: toleranceThreshold },
    { $Type: 'UI.DataField', Label: 'Within Tolerance?',     Value: withinTolerance },
    { $Type: 'UI.DataField', Label: 'Exception Reason',      Value: exceptionReason }
  ]},

  UI.FieldGroup#DocumentPreview : { Data: [
    { $Type: 'UI.DataField', Label: 'File Name',      Value: sourceFile },
    { $Type: 'UI.DataField', Label: 'OCR Confidence', Value: ocrConfidence }
  ]},

  UI.FieldGroup#RecommendedActions : { Data: [
    { $Type: 'UI.DataFieldForAction', Label: 'Accept Match',
      Action: 'ReconService.acceptMatch' },
    { $Type: 'UI.DataFieldForAction', Label: 'Reject',
      Action: 'ReconService.rejectMatch' },
    { $Type: 'UI.DataFieldForAction', Label: 'Escalate to Manager',
      Action: 'ReconService.escalate' },
    { $Type: 'UI.DataFieldForAction', Label: 'Create Dispute',
      Action: 'ReconService.createDispute' }
  ]},

  UI.Identification : [
    { $Type: 'UI.DataFieldForAction', Label: 'Accept Match',       Action: 'ReconService.acceptMatch' },
    { $Type: 'UI.DataFieldForAction', Label: 'Reject',             Action: 'ReconService.rejectMatch' },
    { $Type: 'UI.DataFieldForAction', Label: 'Escalate to Manager',Action: 'ReconService.escalate' },
    { $Type: 'UI.DataFieldForAction', Label: 'Create Dispute',     Action: 'ReconService.createDispute' }
  ]
);

////////////////////////////////////////////////////////////////////////
// Line-Item Comparison Matrix
////////////////////////////////////////////////////////////////////////

annotate ReconService.LineItemComparisons with @(
  UI.LineItem : [
    { $Type: 'UI.DataField', Value: lineNo,       Label: 'Line' },
    { $Type: 'UI.DataField', Value: description,  Label: 'Description' },
    { $Type: 'UI.DataField', Value: qtyFile,      Label: 'Qty (File)',   Criticality: criticality },
    { $Type: 'UI.DataField', Value: qtyS4,        Label: 'Qty (S/4)',    Criticality: criticality },
    { $Type: 'UI.DataField', Value: priceFile,    Label: 'Price (File)', Criticality: criticality },
    { $Type: 'UI.DataField', Value: priceS4,      Label: 'Price (S/4)',  Criticality: criticality },
    { $Type: 'UI.DataField', Value: netFile,      Label: 'Net (File)',   Criticality: criticality },
    { $Type: 'UI.DataField', Value: netS4,        Label: 'Net (S/4)',    Criticality: criticality },
    { $Type: 'UI.DataField', Value: lineStatus.name, Label: 'Status',
      Criticality: criticality, CriticalityRepresentation: #WithoutIcon }
  ]
) {
  lineNo      @Common.Label: 'Line';
  description @Common.Label: 'Description';
};

////////////////////////////////////////////////////////////////////////
// Processing Logs — timeline table
////////////////////////////////////////////////////////////////////////

annotate ReconService.ProcessingLogs with @(
  UI.LineItem : [
    { $Type: 'UI.DataField', Value: stepName.name, Label: 'Step',
      Criticality: criticality, CriticalityRepresentation: #WithIcon },
    { $Type: 'UI.DataField', Value: detail,        Label: 'Detail' },
    { $Type: 'UI.DataField', Value: stepAt,        Label: 'Time' },
    { $Type: 'UI.DataField', Value: status,        Label: 'Status', Criticality: criticality }
  ]
);

////////////////////////////////////////////////////////////////////////
// Workflow / Audit Trail
////////////////////////////////////////////////////////////////////////

annotate ReconService.WorkflowAudits with @(
  UI.LineItem : [
    { $Type: 'UI.DataField', Value: actor,   Label: 'Actor' },
    { $Type: 'UI.DataField', Value: actedAt, Label: 'When' },
    { $Type: 'UI.DataField', Value: action,  Label: 'Action' },
    { $Type: 'UI.DataField', Value: note,    Label: 'Note' }
  ]
);
