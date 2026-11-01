const cds = require('@sap/cds');
const { runMatchRulesForItem } = require('./matching-engine');

const log = cds.log('matching-handler');

function getReason(code, engineReason) {
  switch (code) {
    case 'MATCHED': return "Exact match by invoice number and amount.";
    case 'MATCHED/3WAY': return "Clean 3-way match (PO = GR = Invoice).";
    case 'MATCHED/ROUNDING': return "Matched within rounding tolerance limit.";
    case 'MATCHED/NEAR-MATCH': return "Matched by fuzzy invoice number comparison.";
    case 'MATCHED/TIMING': return "Payment posted in transit timing difference.";
    case 'MATCHED/TDS-194Q': return "Withholding tax TDS u/s 194Q correctly deducted.";
    case 'UNMATCHED/QTY-MORE': return "Invoice quantity exceeds Goods Receipt quantity (reversal/shortage).";
    case 'UNMATCHED/QTY-LESS': return "Invoice quantity is less than Goods Receipt quantity.";
    case 'UNMATCHED/PRICE-HIGH': return "Invoice price exceeds PO rate beyond tolerance limit.";
    case 'UNMATCHED/CN-MISSING': return "Credit Note issued by vendor is missing in buyer's ledger.";
    case 'UNMATCHED/GR-PENDING': return "Goods Receipt (GR) is pending at the buyer plant.";
    case 'UNMATCHED/GST-2B-GAP': return "Invoice missing in buyer GSTR-2B (vendor has not filed returns).";
    case 'UNMATCHED/AMOUNT-DIFF': return "Invoice amount mismatch exceeds tolerance limit.";
    case 'UNMATCHED/FREIGHT': return "Unplanned delivery costs exceed tolerance or require approval.";
    default: return engineReason || "No matching candidate found in buyer ledger.";
  }
}

function getRecommendedAction(code) {
  switch (code) {
    case 'UNMATCHED/QTY-MORE': return "Check short receipt. Reach out to stores/GRN team to verify physical receipt or reverse quantity.";
    case 'UNMATCHED/PRICE-HIGH': return "Review price discrepancy. Request credit note from the vendor or approve rate difference.";
    case 'UNMATCHED/CN-MISSING': return "Book Credit Note in buyer AP ledger.";
    case 'UNMATCHED/GR-PENDING': return "Post Goods Receipt in MIGO for the PO reference.";
    case 'UNMATCHED/GST-2B-GAP': return "Follow up with vendor to file GSTR-1; hold Input Tax Credit (ITC).";
    case 'UNMATCHED/AMOUNT-DIFF': return "Verify invoice amount against purchase order and ledger entry.";
    case 'UNMATCHED/FREIGHT': return "Review and approve unplanned freight/shipping charges with Buyer.";
    default: return "Verify invoice details with the vendor AR team.";
  }
}

function withManaged(entry, req, entity) {
  const user = req?.user?.id || 'system-engine';
  const now = new Date().toISOString();
  
  const base = {
    createdAt: now,
    createdBy: user,
    modifiedAt: now,
    modifiedBy: user,
    ...entry
  };
  
  const cleaned = {};
  for (const key in entity.elements) {
    const element = entity.elements[key];
    if (element.type === 'cds.Association' || element.virtual) continue;
    
    let val = base[key];
    if (typeof val === 'boolean') {
      val = val ? 1 : 0;
    }
    cleaned[key] = val === undefined ? null : val;
  }
  
  for (const key in base) {
    if (key.endsWith('_ID')) {
      cleaned[key] = base[key] === undefined ? null : base[key];
    }
  }
  
  return cleaned;
}

module.exports = (srv) => {
  srv.on('runMatching', async (req) => {
    try {
      const { statementUploadId } = req.data;
      const { VendorInvoiceHeaders, VendorInvoiceItems, VendorLedgerItems, GrirSnapshot, PurchaseOrders, MatchResults, Exceptions, AuditLog, VendorMaster, WorkflowHistory } = cds.entities('vendorrecon.db');

      let headers = [];
      if (statementUploadId) {
        log.info(`Executing matching engine for upload: ${statementUploadId}`);
        headers = await SELECT.from(VendorInvoiceHeaders).where({ statementUploadId });
      } else {
        log.info('No statementUploadId provided. Matching all invoices across HANA, OCR, and statement batches...');
        headers = await SELECT.from(VendorInvoiceHeaders);
      }

      log.info(`Loaded ${headers.length} statement headers to match.`);
      const headerIds = headers.map(h => h.ID);

      await cds.tx(req).run(async (tx) => {
        log.info('Clearing previous match results and exceptions for this upload context...');
        if (headerIds.length > 0) {
          const matchingResults = await tx.run(SELECT.from(MatchResults).where({ vendorDocLine_ID: { in: headerIds } }));
          const resultIds = matchingResults.map(r => r.ID);
          if (resultIds.length > 0) {
            await tx.run(DELETE.from(Exceptions).where({ matchResult_ID: { in: resultIds } }));
            await tx.run(DELETE.from(MatchResults).where({ ID: { in: resultIds } }));
          }
        }

        for (const header of headers) {
          // Fetch Vendor Master for dynamic tolerances
          const vendor = await tx.run(SELECT.one.from(VendorMaster).where({ businessPartner: header.sourceVendorCode }));
          const priceTolPct = vendor?.priceTolerancePct || 2.00;
          
          const candidates = await tx.run(SELECT.from(VendorLedgerItems).where({ supplier: header.sourceVendorCode }));
          
          // Get all line items for this header
          let items = await tx.run(SELECT.from(VendorInvoiceItems).where({ header_ID: header.ID }));
          if (items.length === 0) {
            await tx.run(INSERT.into(VendorInvoiceItems).entries({
              ID: cds.utils.uuid(),
              header_ID: header.ID,
              itemNo: '10',
              poItemReference: '10',
              material: 'DIRECT-LINE-ITEM',
              invoicedQty: 1,
              itemAmount: header.invoiceGrossAmount || 0,
              taxCode: 'IGST'
            }));
            items = await tx.run(SELECT.from(VendorInvoiceItems).where({ header_ID: header.ID }));
          }
          
          // Collect all candidate outcomes for this header
          const allOutcomes = [];

          // 1. Check Header Level rules (e.g. Unplanned Delivery Costs)
          if (header.unplannedDeliveryCosts > 0) {
            allOutcomes.push({
              code: 'UNMATCHED/FREIGHT',
              rule: 'RULE_UNPLANNED_COSTS',
              delta: header.unplannedDeliveryCosts,
              reason: getReason('UNMATCHED/FREIGHT'),
              priority: 'P2',
              businessRole: 'MIRO',
              itemId: null
            });
          }

          let lastGrirRow = null;
          // 2. Line Item Level Matching
          for (const item of items) {
            let poRef = header.poReference;
            
            let grirQuery = { purchaseOrder: poRef };
            if (item.poItemReference) {
              let strItem = String(item.poItemReference);
              let paddedItem = strItem.padStart(5, '0');
              grirQuery = { purchaseOrder: poRef, purchaseOrderItem: { 'in': [strItem, paddedItem] } };
            }
            const grirRow = poRef ? await tx.run(SELECT.one.from(GrirSnapshot).where(grirQuery)) : null;
            if (grirRow) lastGrirRow = grirRow;

            let poQuery = { purchaseOrder: poRef };
            if (item.poItemReference) {
              let strItem = String(item.poItemReference);
              let paddedItem = strItem.padStart(5, '0');
              poQuery = { purchaseOrder: poRef, poItem: { 'in': [strItem, paddedItem] } };
            }
            const poRecord = poRef ? await tx.run(SELECT.one.from(PurchaseOrders).where(poQuery)) : null;

            // Run 3-Way Enterprise Matching Engine
            const outcomes = await runMatchRulesForItem(header, item, candidates, vendor, poRecord, grirRow);
            for (const outcome of outcomes) {
              let priority = 'P3';
              if (outcome.code === 'UNMATCHED/QTY-MORE' || 
                  outcome.code === 'UNMATCHED/PRICE-HIGH' || 
                  outcome.code === 'UNMATCHED/GST-2B-GAP' || 
                  outcome.code === 'UNMATCHED/GR-PENDING' ||
                  outcome.code === 'UNMATCHED/CN-MISSING' ||
                  outcome.code === 'UNMATCHED/AMOUNT-DIFF') {
                priority = 'P1';
              } else if (outcome.code === 'UNMATCHED/FREIGHT' || (outcome.code && outcome.code.includes('TAX'))) {
                priority = 'P2';
              }
              allOutcomes.push({
                ...outcome,
                priority,
                itemId: item.ID
              });
            }
          }

          // Pick the single dominant outcome for this invoice header
          const unmatchedOutcomes = allOutcomes.filter(o => 
            o.code && (o.code.startsWith('UNMATCHED') || o.code.includes('-DIFF') || o.code.includes('-PENDING') || o.code.includes('-GAP') || o.code.includes('-MISSING'))
          );

          let primaryOutcome;
          if (unmatchedOutcomes.length > 0) {
            // Prioritize P1 > P2 > P3
            const p1 = unmatchedOutcomes.find(o => o.priority === 'P1');
            const p2 = unmatchedOutcomes.find(o => o.priority === 'P2');
            primaryOutcome = p1 || p2 || unmatchedOutcomes[0];
          } else if (allOutcomes.length > 0) {
            primaryOutcome = allOutcomes[0];
          } else {
            primaryOutcome = {
              code: 'MATCHED/3-WAY-CLEAR',
              rule: 'RULE_3WAY_COMPLETE',
              delta: 0,
              reason: 'Invoice successfully matched against PO and Goods Receipt.',
              priority: 'P3',
              businessRole: 'AP'
            };
          }

          const matchResultId = cds.utils.uuid();
          let assignedRole = primaryOutcome.businessRole;
          if (!assignedRole) {
            if (primaryOutcome.rule === 'RULE_PO_GR' || (primaryOutcome.code && primaryOutcome.code.includes('GR-PENDING'))) {
              assignedRole = 'GR';
            } else if (primaryOutcome.rule === 'RULE_AMOUNT' || (primaryOutcome.code && (primaryOutcome.code.includes('AMOUNT-DIFF') || primaryOutcome.code.includes('PRICE-HIGH')))) {
              assignedRole = 'MIRO';
            } else if (primaryOutcome.rule === 'RULE_GST_TDS' || (primaryOutcome.code && (primaryOutcome.code.includes('GST-DIFF') || primaryOutcome.code.includes('TAX')))) {
              assignedRole = 'BILLING';
            } else {
              assignedRole = 'AP';
            }
          }

          let amountDelta = 0;
          if (primaryOutcome.delta != null) {
            amountDelta = Math.abs(primaryOutcome.delta);
          } else if (primaryOutcome.code && (primaryOutcome.code.startsWith('UNMATCHED') || primaryOutcome.code.includes('-DIFF') || primaryOutcome.code.includes('-PENDING'))) {
            amountDelta = Math.abs(header.invoiceGrossAmount || 0);
          }

          let grNumberVal = 'Pending MIGO';
          if (primaryOutcome.code && primaryOutcome.code.includes('PO-NOT-FOUND')) {
            grNumberVal = 'N/A';
          } else if (lastGrirRow && lastGrirRow.grNumber) {
            grNumberVal = lastGrirRow.grNumber;
          } else if (lastGrirRow && lastGrirRow.goodsReceiptQty > 0) {
            grNumberVal = 'GRN-' + String(header.poReference || header.vendorInvoiceNo || '').slice(-6);
          } else if (primaryOutcome.code && primaryOutcome.code.includes('GR-PENDING')) {
            grNumberVal = 'Pending MIGO';
          } else if (header.poReference) {
            grNumberVal = 'GRN-' + String(header.poReference).slice(-6);
          }

          // Insert exactly ONE line-item matching result per invoice header
          await tx.run(INSERT.into('vendorrecon.db.MatchResults').entries(withManaged({
            ID: matchResultId,
            vendorDocLine_ID: header.ID,
            invoiceItem_ID: primaryOutcome.itemId || (items[0] && items[0].ID) || null,
            ledgerItem_ID: primaryOutcome.ledgerItemID || null,
            outcomeCode: primaryOutcome.code,
            amountDelta: amountDelta,
            matchRuleApplied: primaryOutcome.rule,
            businessRole: assignedRole,
            invoiceNo: header.vendorInvoiceNo,
            grNumber: grNumberVal,
            reason: getReason(primaryOutcome.code, primaryOutcome.reason)
          }, req, MatchResults)));

          if (primaryOutcome.code.startsWith('UNMATCHED') || primaryOutcome.code.includes('-DIFF') || primaryOutcome.code.includes('-PENDING') || primaryOutcome.code.includes('-GAP') || primaryOutcome.code.includes('-MISSING') || primaryOutcome.code === 'UNMATCHED') {
            let ageInDays = 0;
            if (header.invoiceDate) {
              ageInDays = Math.max(0, Math.floor((new Date() - new Date(header.invoiceDate)) / 86400000));
            }
            const msmeAlert = !!(vendor && (vendor.isMsme === true || vendor.isMsme === 1));
            const exceptionId = cds.utils.uuid();
            await tx.run(INSERT.into('vendorrecon.db.Exceptions').entries(withManaged({
              ID: exceptionId,
              matchResult_ID: matchResultId,
              invoiceNo: header.vendorInvoiceNo,
              poReference: header.poReference,
              outcomeCode: primaryOutcome.code,
              status: 'OPEN',
              priority: primaryOutcome.priority || 'P3',
              ageInDays,
              msmeAlert,
              recommendedAction: getRecommendedAction(primaryOutcome.code)
            }, req, Exceptions)));

            await tx.run(INSERT.into('vendorrecon.db.WorkflowHistory').entries(withManaged({
              ID: cds.utils.uuid(),
              exceptionID: exceptionId,
              stepName: 'Intake/Match',
              actor: 'system-engine',
              action: 'CREATE',
              comment: 'Exception automatically created by matching engine',
              timestamp: new Date().toISOString()
            }, req, WorkflowHistory)));
          }
   
          await tx.run(INSERT.into('vendorrecon.db.AuditLog').entries(withManaged({
            ID: cds.utils.uuid(),
            entityName: 'MatchResults',
            entityKey: primaryOutcome.itemId || header.ID,
            action: 'MATCH',
            performedBy: req?.user?.id || 'system-engine',
            afterValue: JSON.stringify(primaryOutcome),
            performedAt: new Date().toISOString(),
          }, req, AuditLog)));
        }
      });

      log.info('Matching cycle completed successfully. Transaction committed.');
      return 'Matching completed';
    } catch (err) {
      log.error('Matching engine cycle execution failed:', err);
      if (typeof req.error === 'function') {
        return req.error(500, `Matching failed: ${err.message}`);
      }
      throw err;
    }
  });

  srv.on('resolveException', async (req) => {
    try {
      const { exceptionId, note } = req.data;
      if (!exceptionId) return req.error(400, 'Exception ID is required.');
      
      const { Exceptions, WorkflowHistory } = cds.entities('vendorrecon.db');
      
      await cds.tx(req).run(async (tx) => {
        await tx.run(UPDATE(Exceptions, exceptionId).with({ status: 'RESOLVED' }));
        
        await tx.run(INSERT.into(WorkflowHistory).entries({
          ID: cds.utils.uuid(),
          exceptionID: exceptionId,
          stepName: 'Resolution',
          actor: req.user?.id || req.http?.req?.headers['x-user-role'] || 'AP_Specialist',
          action: 'RESOLVE',
          comment: note || 'Resolved by user',
          timestamp: new Date().toISOString()
        }));
      });
      
      log.info(`Exception ${exceptionId} resolved successfully.`);
      return 'Resolved';
    } catch (err) {
      log.error('Failed to resolve exception:', err);
      return req.error(500, `Resolution failed: ${err.message}`);
    }
  });
 
  srv.on('reopenException', async (req) => {
    try {
      const { exceptionId } = req.data;
      if (!exceptionId) return req.error(400, 'Exception ID is required.');
      
      const { Exceptions, WorkflowHistory } = cds.entities('vendorrecon.db');
      
      await cds.tx(req).run(async (tx) => {
        await tx.run(UPDATE(Exceptions, exceptionId).with({ status: 'OPEN' }));
        
        await tx.run(INSERT.into(WorkflowHistory).entries({
          ID: cds.utils.uuid(),
          exceptionID: exceptionId,
          stepName: 'Reopen',
          actor: req.user?.id || req.http?.req?.headers['x-user-role'] || 'AP_Specialist',
          action: 'REOPEN',
          comment: 'Exception reopened for re-investigation',
          timestamp: new Date().toISOString()
        }));
      });
      
      log.info(`Exception ${exceptionId} reopened successfully.`);
      return 'Reopened';
    } catch (err) {
      log.error('Failed to reopen exception:', err);
      return req.error(500, `Reopening failed: ${err.message}`);
    }
  });

  srv.on('raiseDispute', async (req) => {
    try {
      const { exceptionId, comment } = req.data;
      if (!exceptionId) return req.error(400, 'Exception ID is required.');
      
      const { Exceptions, WorkflowHistory } = cds.entities('vendorrecon.db');
      
      await cds.tx(req).run(async (tx) => {
        await tx.run(UPDATE(Exceptions, exceptionId).with({ status: 'DISPUTED' }));
        
        await tx.run(INSERT.into(WorkflowHistory).entries({
          ID: cds.utils.uuid(),
          exceptionID: exceptionId,
          stepName: 'Dispute',
          actor: req.user?.id || req.http?.req?.headers['x-user-vendor'] || 'Vendor_AR',
          action: 'DISPUTE',
          comment: comment || 'Dispute raised by vendor',
          timestamp: new Date().toISOString()
        }));
      });
      
      log.info(`Dispute raised on exception ${exceptionId} successfully.`);
      return 'Disputed';
    } catch (err) {
      log.error('Failed to raise dispute:', err);
      return req.error(500, `Dispute failed: ${err.message}`);
    }
  });
};
