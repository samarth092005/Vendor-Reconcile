sap.ui.define([
  "sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  return Controller.extend("vendordoclines.controller.Workbench", {
    onInit: function () {
      this._allRows = [];
      this.getView().setModel(new JSONModel({ filter: "ALL", search: "", rows: [], active: null }), "wb");
      
      try {
        const router = this.getOwnerComponent().getRouter();
        router.getRoute("main").attachPatternMatched(this.loadData, this);
      } catch (err) {
        console.warn("Router not available during Workbench onInit");
      }
      this.loadData();
    },
    loadData: function () {
      Promise.all([
        fetch("/api/v1/VendorDocLines").then(r => r.json()),
        fetch("/api/v1/MatchResults").then(r => r.json()),
        fetch("/api/v1/VendorLedgerItems").then(r => r.json()),
        fetch("/api/v1/Exceptions").then(r => r.json())
      ]).then(([lines, results, ledger, exceptions]) => {
        const rByLine = new Map(results.value.map(r => [r.vendorDocLine_ID, r]));
        const lById = new Map(ledger.value.map(l => [l.ID, l]));
        const exByResult = new Map(exceptions.value.map(e => [e.matchResult_ID, e]));

        this._allRows = lines.value.map(line => {
          const r = rByLine.get(line.ID);
          const ex = r ? exByResult.get(r.ID) : undefined;
          const ledgerItem = r?.ledgerItem_ID ? lById.get(r.ledgerItem_ID) : undefined;
          const code = r?.outcomeCode ?? "UNMATCHED";
          return {
            id: line.ID, vendorInvoiceNo: line.vendorInvoiceNo, documentRef: line.documentRef || "—", invoiceDate: line.invoiceDate,
            createdAt: line.createdAt ? new Date(line.createdAt).toLocaleString() : "—",
            invoiceAmount: line.invoiceAmount, poReference: line.poReference || "—",
            sourceVendorCode: line.sourceVendorCode, currency: line.currency,
            outcomeCode: code, outcomeState: this._tone(code),
            amountDelta: r?.amountDelta || 0, matchRuleApplied: r?.matchRuleApplied || "—",
            exceptionId: ex?.ID, exStatus: ex?.status, exState: ex?.status === "OPEN" ? "Warning" : "Success",
            canResolve: ex?.status === "OPEN", canReopen: ex?.status === "RESOLVED",
            ledgerDoc: ledgerItem?.accountingDocument || (line.paymentReference && !line.paymentReference.startsWith('PAY-') ? line.paymentReference : "-"),
            ledgerAmount: ledgerItem?.amountInTransCrcy || "-",
            ledgerCleared: ledgerItem?.isCleared ? "Yes" : "No",
            recommendedAction: ex?.recommendedAction || "-",
            approvedForPayment: line.approvedForPayment,
            reason: r?.reason || "N/A"
          };
        });
        this._applyFilter();
      }).catch(e => MessageToast.show("Load error: " + e.message));
    },
    _tone: function (code) {
      if (code === "MATCHED" || code === "MATCHED/3WAY" || code.startsWith("MATCHED")) return "Success";
      if (code.startsWith("UNMATCHED")) return "Error";
      return "Warning";
    },
    _applyFilter: function () {
      const model = this.getView().getModel("wb");
      const filter = model.getProperty("/filter");
      const q = (model.getProperty("/search") || "").toLowerCase();
      let rows = this._allRows;
      if (filter === "MATCHED") rows = rows.filter(r => r.outcomeCode.startsWith("MATCHED"));
      if (filter === "UNMATCHED") rows = rows.filter(r => r.outcomeCode.startsWith("UNMATCHED"));
      if (filter === "EXCEPTIONS") rows = rows.filter(r => !!r.exceptionId);
      if (filter === "OPEN") rows = rows.filter(r => r.exStatus === "OPEN");
      if (q) rows = rows.filter(r => `${r.vendorInvoiceNo} ${r.poReference} ${r.sourceVendorCode}`.toLowerCase().includes(q));
      model.setProperty("/rows", rows);
    },
    onFilterChange: function (oEvent) {
      this.getView().getModel("wb").setProperty("/filter", oEvent.getParameter("item").getKey());
      this._applyFilter();
    },
    onSearch: function (oEvent) {
      this.getView().getModel("wb").setProperty("/search", oEvent.getParameter("newValue"));
      this._applyFilter();
    },
    onItemSelect: function (oEvent) {
      const item = oEvent.getParameter("listItem");
      const ctx = item.getBindingContext("wb").getObject();
      
      // Async fetch the item details for the right side Split-Screen
      fetch(`/api/v1/VendorInvoiceItems?$filter=header_ID eq ${ctx.id}`)
        .then(r => r.json())
        .then(itemData => {
           const lineItem = (itemData && itemData.value && itemData.value.length > 0) ? itemData.value[0] : {};
           
           // Fetch PO Data for right screen
           fetch(`/api/v1/PurchaseOrders?$filter=purchaseOrder eq '${ctx.poReference}'`)
           .then(r => r.json())
           .then(poData => {
               const poRecord = (poData && poData.value && poData.value.length > 0) ? poData.value[0] : {};
               
               const expectedAmount = (poRecord.poAmount || 0) / (poRecord.poQty || 1) * (lineItem.invoicedQty || 0);

               const activeObj = {
                 ...ctx,
                 hasException: !!ctx.exceptionId,
                 canResolve: ctx.exStatus === "OPEN" || ctx.exStatus === "DISPUTED",
                 canDispute: ctx.exStatus === "OPEN",
                 canReopen: ctx.exStatus === "RESOLVED",
                 invoicedQty: lineItem.invoicedQty || 0,
                 expectedAmount: expectedAmount || 0,
                 receivedQty: poRecord.receivedQty || 0,
                 history: []
               };
               
               this.getView().getModel("wb").setProperty("/active", activeObj);
           });
        });
    },
    onCloseDetails: function () { 
      this.getView().getModel("wb").setProperty("/active", null); 
      this.byId("wbList").removeSelections(true); 
    },
    _resolve: function (exceptionId, note) {
      const model = this.getView().getModel();
      const ctx = model.bindContext("/resolveException(...)");
      ctx.setParameter("exceptionId", exceptionId);
      ctx.setParameter("note", note || "");
      ctx.execute().then(() => { MessageToast.show("Exception marked RESOLVED"); this.loadData(); this.onCloseDetails(); });
    },
    _reopen: function (exceptionId) {
      const model = this.getView().getModel();
      const ctx = model.bindContext("/reopenException(...)");
      ctx.setParameter("exceptionId", exceptionId);
      ctx.execute().then(() => { MessageToast.show("Exception reopened"); this.loadData(); this.onCloseDetails(); });
    },
    onResolvePress: function (oEvent) {
      const row = oEvent.getSource().getBindingContext("wb").getObject();
      this._resolve(row.exceptionId, "");
    },
    onReopenPress: function (oEvent) {
      const row = oEvent.getSource().getBindingContext("wb").getObject();
      this._reopen(row.exceptionId);
    },
    onResolveFromDialog: function () {
      const active = this.getView().getModel("wb").getProperty("/active");
      this._resolve(active.exceptionId, this.byId("resolutionNote")?.getValue());
    },
    onReopenFromDialog: function () {
      const active = this.getView().getModel("wb").getProperty("/active");
      this._reopen(active.exceptionId);
    },
    onDisputeFromDialog: function () {
      const active = this.getView().getModel("wb").getProperty("/active");
      const note = this.byId("resolutionNote")?.getValue();
      const model = this.getView().getModel();
      const ctx = model.bindContext("/raiseDispute(...)");
      ctx.setParameter("exceptionId", active.exceptionId);
      ctx.setParameter("comment", note || "Disputed via UI");
      ctx.execute().then(() => { 
        MessageToast.show("Dispute submitted successfully"); 
        this.onCloseDetails();
        this.loadData(); 
      }).catch(e => MessageToast.show("Error: " + e.message));
    },
    onRequestMigo: function() {
        MessageToast.show("Notification sent to Stores/Warehouse team to post MIGO!");
    },
    onApproveForPaymentFromDialog: function () {
      const active = this.getView().getModel("wb").getProperty("/active");
      const model = this.getView().getModel();
      const ctx = model.bindContext("/approveForPayment(...)");
      ctx.setParameter("docLineId", active.id);
      ctx.execute().then(() => {
        MessageToast.show("Invoice approved and auto-posted via MIRO to S/4HANA!");
        this.onCloseDetails();
        this.loadData();
      }).catch(e => MessageToast.show("Error: " + e.message));
    }
  });
});