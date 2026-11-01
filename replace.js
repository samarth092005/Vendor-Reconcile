const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/Main.controller.js', 'utf8');
const regex = /onInvoicePress:\s*function\(oEvent\)\s*\{[\s\S]*?this\.oDetailsDialog\.open\(\);\s*\}\s*\}/;
const replacement = `onInvoicePress: async function(oEvent) {
    let oCtx = oEvent.getSource().getBindingContext();
    const isMiro = !oCtx;
    if (isMiro) oCtx = oEvent.getSource().getBindingContext('miro');
    if (!oCtx) return;
    let obj = isMiro ? oCtx.getObject() : await oCtx.requestObject();
    const data = {
        invoiceNo: obj.vendorInvoiceNo || obj.invoiceNo,
        createdAt: obj.createdAt || obj.postedAt,
        grossAmount: obj.invoiceAmount || obj.invoiceGrossAmount || (obj.vendorDocLine && obj.vendorDocLine.invoiceGrossAmount) || (obj.matchResult && obj.matchResult.vendorDocLine && obj.matchResult.vendorDocLine.invoiceGrossAmount) || obj.amount,
        currency: obj.currency || (obj.vendorDocLine && obj.vendorDocLine.currency) || (obj.matchResult && obj.matchResult.vendorDocLine && obj.matchResult.vendorDocLine.currency) || 'INR',
        vendor: obj.sourceVendorCode || (obj.vendorDocLine && obj.vendorDocLine.sourceVendorCode) || (obj.matchResult && obj.matchResult.vendorDocLine && obj.matchResult.vendorDocLine.sourceVendorCode) || obj.vendor,
        poReference: obj.poReference || (obj.vendorDocLine && obj.vendorDocLine.poReference) || (obj.matchResult && obj.matchResult.vendorDocLine && obj.matchResult.vendorDocLine.poReference) || obj.poNo,
        grReference: obj.grNumber || (obj.matchResult && obj.matchResult.grNumber) || obj.grStatus || 'N/A',
        outcomeCode: obj.outcomeCode || (obj.matchResult && obj.matchResult.outcomeCode) || 'Unknown',
        ruleApplied: obj.matchRuleApplied || (obj.matchResult && obj.matchResult.matchRuleApplied) || 'Standard Matching'
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
