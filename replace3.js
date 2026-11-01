const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/Main.controller.js', 'utf8');
const regex = /onInvoicePress:\s*async function\(oEvent\)\s*\{[\s\S]*?this\.oDetailsDialog\.open\(\);\s*\}\s*\}/;
const replacement = `onInvoicePress: async function(oEvent) {
    let oCtx = oEvent.getSource().getBindingContext();
    const isMiro = !oCtx;
    if (isMiro) oCtx = oEvent.getSource().getBindingContext('miro');
    if (!oCtx) return;
    let obj = isMiro ? oCtx.getObject() : await oCtx.requestObject();
    
    let mr = obj.matchResult || null;
    // If clicking from Data Intake, fetch the match result dynamically!
    if (!isMiro && !mr && oCtx.getPath().includes('VendorDocLines')) {
        try {
            const res = await fetch('/api/v1/MatchResults?$filter=vendorDocLine_ID eq ' + obj.ID);
            const json = await res.json();
            if (json.value && json.value.length > 0) {
                mr = json.value[0];
            }
        } catch(e) {}
    }

    const data = {
        invoiceNo: obj.vendorInvoiceNo || obj.invoiceNo,
        createdAt: obj.createdAt || obj.postedAt,
        grossAmount: obj.invoiceAmount || obj.invoiceGrossAmount || (obj.vendorDocLine && obj.vendorDocLine.invoiceGrossAmount) || (mr && mr.vendorDocLine && mr.vendorDocLine.invoiceGrossAmount) || obj.amount,
        currency: obj.currency || (obj.vendorDocLine && obj.vendorDocLine.currency) || (mr && mr.vendorDocLine && mr.vendorDocLine.currency) || 'INR',
        vendor: obj.sourceVendorCode || (obj.vendorDocLine && obj.vendorDocLine.sourceVendorCode) || (mr && mr.vendorDocLine && mr.vendorDocLine.sourceVendorCode) || obj.vendor,
        poReference: obj.poReference || (obj.vendorDocLine && obj.vendorDocLine.poReference) || (mr && mr.vendorDocLine && mr.vendorDocLine.poReference) || obj.poNo,
        grReference: obj.grNumber || (mr && mr.grNumber) || obj.grStatus || 'N/A',
        outcomeCode: obj.outcomeCode || (mr && mr.outcomeCode) || 'Unknown',
        ruleApplied: obj.matchRuleApplied || (mr && mr.matchRuleApplied) || 'Standard Matching'
    };
    const JSONModel = sap.ui.require('sap/ui/model/json/JSONModel') || sap.ui.model.json.JSONModel;
    const oModel = new JSONModel(data);
    if (!this.oDetailsDialog) {
        sap.ui.core.Fragment.load({ name: 'vendordoclines.view.InvoiceDetails', controller: this }).then(function(oDialog) {
            this.oDetailsDialog = oDialog;
            this.getView().addDependent(this.oDetailsDialog);
            this.oDetailsDialog.setModel(oModel, 'details');
            this.oDetailsDialog.open();
        }.bind(this));
    } else {
        this.oDetailsDialog.setModel(oModel, 'details');
        this.oDetailsDialog.open();
    }
}`;
code = code.replace(regex, replacement);
fs.writeFileSync('app/vendordoclines/webapp/controller/Main.controller.js', code);
