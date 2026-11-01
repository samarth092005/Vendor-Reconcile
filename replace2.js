const fs = require('fs');
let code = fs.readFileSync('app/vendordoclines/webapp/controller/MIROWorkbench.controller.js', 'utf8');
const regex = /onInvoicePress:\s*function\(oEvent\)\s*\{[\s\S]*?this\.oDetailsDialog\.open\(\);\s*\}\s*\}/;
const replacement = `onInvoicePress: function(oEvent) {
    let oCtx = oEvent.getSource().getBindingContext('miro');
    if (!oCtx) return;
    let obj = oCtx.getObject();
    const data = {
        invoiceNo: obj.invoiceNo,
        createdAt: obj.postedAt,
        grossAmount: obj.amount,
        currency: 'INR',
        vendor: obj.vendor,
        poReference: obj.poNo,
        grReference: obj.grStatus || 'N/A',
        outcomeCode: obj.outcomeCode || 'Unknown',
        ruleApplied: obj.matchRuleApplied || 'Standard Matching'
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
fs.writeFileSync('app/vendordoclines/webapp/controller/MIROWorkbench.controller.js', code);
