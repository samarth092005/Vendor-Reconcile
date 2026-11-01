/**
 * ReconService — CAP handlers for the Vendor Reconciliation Dashboard.
 *
 * Responsibilities:
 *   1. Compute virtual `criticality` on read (drives semantic colors in Fiori Elements).
 *   2. Handle bound actions (acceptMatch / rejectMatch / escalate / createDispute).
 *   3. Handle service action `triggerRun` — delegates to the ExtractionService
 *      (mock today, real BTP destination later).
 */
const cds = require('@sap/cds');

// Criticality codes used across Fiori Elements:
//   1 = red (negative), 2 = yellow (critical), 3 = green (positive), 5 = informational (blue)
const STATUS_CRITICALITY = {
  Matched: 3,
  Tolerance: 2,
  Mismatch: 1,
  MissingInS4: 1,
  MissingInFile: 1,
  Duplicate: 2,
  Blocked: 1
};

module.exports = cds.service.impl(async function () {

  const {
    ReconciliationResults,
    WorkflowAudits,
    ReconciliationRuns
  } = this.entities;

  // -----------------------------------------------------------------
  // Virtual criticality — computed on READ so Fiori Elements can bind
  // ObjectStatus / DataPoint criticality without persisting the value.
  // -----------------------------------------------------------------

  this.after('READ', ReconciliationResults, (rows) => {
    if (!rows) return;
    const arr = Array.isArray(rows) ? rows : [rows];
    for (const r of arr) {
      if (r && r.status_code) {
        r.criticality = STATUS_CRITICALITY[r.status_code] ?? 5;
      }
    }
  });

  // Note: LineItemComparisons and ProcessingLogs criticality is computed
  // directly in the CDS projection (case-when) so it also works via $expand.

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------

  async function appendAudit(tx, resultId, action, note) {
    await tx.run(
      INSERT.into(WorkflowAudits).entries({
        ID: cds.utils.uuid(),
        result_ID: resultId,
        actor: (cds.context.user && cds.context.user.id) || 'system',
        actedAt: new Date().toISOString(),
        action,
        note
      })
    );
  }

  async function readResult(tx, id) {
    const row = await tx.run(SELECT.one.from(ReconciliationResults).where({ ID: id }));
    if (row) row.criticality = STATUS_CRITICALITY[row.status_code] ?? 5;
    return row;
  }

  function keyOf(req) {
    // For bound actions on ReconciliationResults, the ID is the last param.
    const last = req.params && req.params[req.params.length - 1];
    if (last && typeof last === 'object' && 'ID' in last) return last.ID;
    if (typeof last === 'string') return last;
    if (req.data && req.data.ID) return req.data.ID;
    return null;
  }

  // -----------------------------------------------------------------
  // Bound actions
  // -----------------------------------------------------------------

  this.on('acceptMatch', 'ReconciliationResults', async (req) => {
    const id = keyOf(req);
    const tx = cds.tx(req);
    await tx.run(
      UPDATE(ReconciliationResults).set({
        status_code: 'Matched',
        lastUpdatedAt: new Date().toISOString()
      }).where({ ID: id })
    );
    await appendAudit(tx, id, 'Accepted match', 'Manual acceptance by AP user');
    return readResult(tx, id);
  });

  this.on('rejectMatch', 'ReconciliationResults', async (req) => {
    const id = keyOf(req);
    const reason = req.data.reason || 'Rejected by AP user';
    const tx = cds.tx(req);
    await tx.run(
      UPDATE(ReconciliationResults).set({
        status_code: 'Mismatch',
        exceptionReason: reason,
        lastUpdatedAt: new Date().toISOString()
      }).where({ ID: id })
    );
    await appendAudit(tx, id, 'Rejected match', reason);
    return readResult(tx, id);
  });

  this.on('escalate', 'ReconciliationResults', async (req) => {
    const id = keyOf(req);
    const toGroup = req.data.toGroup || 'AP Manager';
    const tx = cds.tx(req);
    await tx.run(
      UPDATE(ReconciliationResults).set({
        assignedTo: toGroup,
        lastUpdatedAt: new Date().toISOString()
      }).where({ ID: id })
    );
    await appendAudit(tx, id, 'Escalated', `Escalated to ${toGroup}`);
    return readResult(tx, id);
  });

  this.on('createDispute', 'ReconciliationResults', async (req) => {
    const id = keyOf(req);
    const note = req.data.note || 'Dispute created';
    const tx = cds.tx(req);
    await tx.run(
      UPDATE(ReconciliationResults).set({
        exceptionReason: `Dispute: ${note}`,
        lastUpdatedAt: new Date().toISOString()
      }).where({ ID: id })
    );
    await appendAudit(tx, id, 'Created dispute', note);
    return readResult(tx, id);
  });

  // -----------------------------------------------------------------
  // Unbound service action — triggers a new reconciliation run.
  // Delegates extraction to the ExtractionService (mock or real).
  // -----------------------------------------------------------------

  this.on('triggerRun', async (req) => {
    const location = req.data.sourceLocation || '\\\\shared\\vendor-invoices\\';
    const extraction = await cds.connect.to('ExtractionService');

    // Same call for mock and real BTP destination:
    const extracted = await extraction.send({
      method: 'GET',
      path: `extract(location='${encodeURIComponent(location)}')`
    }).catch(async () => {
      // Fallback for the mock impl which registers as a function handler
      return extraction.run(extraction.operations.extract({ location }));
    });

    const runId = `RUN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-AD`;
    const tx = cds.tx(req);
    await tx.run(
      INSERT.into(ReconciliationRuns).entries({
        ID: runId,
        startedAt: new Date().toISOString(),
        sourceLocation: location,
        batchStatus: 'Running',
        totalInvoices: Array.isArray(extracted) ? extracted.length : 0
      })
    );

    return tx.run(SELECT.one.from(ReconciliationRuns).where({ ID: runId }));
  });
});
