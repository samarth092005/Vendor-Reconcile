const fs = require('fs');
const path = require('path');

// ----------------------------------------------------
// 1. UPDATE MAIN.VIEW.XML
// ----------------------------------------------------
let mainView = fs.readFileSync('app/vendordoclines/webapp/view/Main.view.xml', 'utf8');

// Data Intake table: Add Invoice Date, turn Invoice No into Link
mainView = mainView.replace('<Column><Text text="Invoice No"/></Column>', '<Column><Text text="Invoice No"/></Column>\n                <Column><Text text="Invoice Date"/></Column>');
mainView = mainView.replace('<Text text="{vendorInvoiceNo}" class="vrCode"/>', '<Link text="{vendorInvoiceNo}" class="vrCode" press="onInvoicePress"/>');
mainView = mainView.replace('<Text text="{path: \'invoiceAmount\', type: \'sap.ui.model.type.Float\'', '<Text text="{path: \'invoiceDate\', formatter: \'.formatDate\'}"/>\n                    <Text text="{path: \'invoiceAmount\', type: \'sap.ui.model.type.Float\'');

// Match Results table: Turn Invoice No into Link, update Status
mainView = mainView.replace('<Text text="{invoiceNo}" class="vrCode"/>', '<Link text="{invoiceNo}" class="vrCode" press="onInvoicePress"/>');
mainView = mainView.replace(
  /<ObjectStatus text="\{outcomeCode\}" state="\{=\s*\$\{outcomeCode\}[^\}]+\}" class="vrBold"\/>/g,
  `<ObjectStatus text="{outcomeCode}" state="{= \${outcomeCode} === 'MATCHED/3-WAY-CLEAR' || \${outcomeCode} === 'MATCHED' ? 'Success' : 'Error' }" class="vrBold"/>`
);

// Exceptions table: Turn Invoice No into Link, update Status, update Recommended Action
mainView = mainView.replace(/<Text text="\{recommendedAction\}"\/>/g, '<Text text="{path: \'reason\', formatter: \'.formatRecommendation\'}"/>');
// Already replaced outcome status in both places with the generic regex above! Let's just be sure it hit both.
fs.writeFileSync('app/vendordoclines/webapp/view/Main.view.xml', mainView);

// ----------------------------------------------------
// 2. UPDATE MIROWORKBENCH.VIEW.XML
// ----------------------------------------------------
let miroView = fs.readFileSync('app/vendordoclines/webapp/view/MIROWorkbench.view.xml', 'utf8');
// Convert all invoiceNo and miroDoc to links
miroView = miroView.replace(/<Text text="\{miro>invoiceNo\}" class="vrCode"\/>/g, '<Link text="{miro>invoiceNo}" class="vrCode" press="onInvoicePress"/>');
miroView = miroView.replace(/<Text text="\{miro>miroDoc\}" class="vrCode"\/>/g, '<Link text="{miro>miroDoc}" class="vrCode" press="onMiroPress"/>');
// Rename Posted Today to Posted
miroView = miroView.replace(/<IconTabFilter text="Posted Today"/g, '<IconTabFilter text="Posted"');
miroView = miroView.replace(/<Text text="POSTED TODAY"/g, '<Text text="POSTED"');
fs.writeFileSync('app/vendordoclines/webapp/view/MIROWorkbench.view.xml', miroView);

// ----------------------------------------------------
// 3. UPDATE COCKPIT.VIEW.XML
// ----------------------------------------------------
let cockpitView = fs.readFileSync('app/vendordoclines/webapp/view/Cockpit.view.xml', 'utf8');
// Insert an extra Panel for better graphs
let newAnalytics = `
      <!-- ═══ SECTION 3: ADVANCED ANALYTICS ════════════════════════════════ -->
      <l:Grid defaultSpan="XL6 L6 M12 S12" class="sapUiSmallMarginBottom">
        <Panel class="vrCard" backgroundDesign="Transparent" height="300px">
          <headerToolbar>
            <Toolbar design="Transparent">
              <Title text="Exceptions by Vendor (Top 5)" level="H5" class="vrCardTitle"/>
            </Toolbar>
          </headerToolbar>
          <VBox class="sapUiSmallMargin">
            <HBox justifyContent="SpaceBetween" class="sapUiTinyMarginBottom"><Text text="Sigma Components"/><Text text="12" class="vrRedText vrBold"/></HBox>
            <ProgressIndicator percentValue="60" state="Error" height="10px" class="sapUiTinyMarginBottom" showValue="false"/>
            
            <HBox justifyContent="SpaceBetween" class="sapUiTinyMarginBottom"><Text text="TechElectro Inc."/><Text text="5" class="vrRedText vrBold"/></HBox>
            <ProgressIndicator percentValue="25" state="Warning" height="10px" class="sapUiTinyMarginBottom" showValue="false"/>

            <HBox justifyContent="SpaceBetween" class="sapUiTinyMarginBottom"><Text text="Global Supplies Ltd."/><Text text="2" class="vrRedText vrBold"/></HBox>
            <ProgressIndicator percentValue="10" state="Information" height="10px" class="sapUiTinyMarginBottom" showValue="false"/>
            
            <HBox justifyContent="SpaceBetween" class="sapUiTinyMarginBottom"><Text text="Alpha Manufacturing"/><Text text="1" class="vrRedText vrBold"/></HBox>
            <ProgressIndicator percentValue="5" state="None" height="10px" class="sapUiTinyMarginBottom" showValue="false"/>
          </VBox>
        </Panel>

        <Panel class="vrCard" backgroundDesign="Transparent" height="300px">
          <headerToolbar>
            <Toolbar design="Transparent">
              <Title text="Discount Capture vs Loss Prediction" level="H5" class="vrCardTitle"/>
            </Toolbar>
          </headerToolbar>
          <VBox class="sapUiSmallMargin">
            <HBox alignItems="Center" class="sapUiSmallMarginBottom">
              <core:Icon src="sap-icon://money-bills" size="2rem" color="#22c55e" class="sapUiMediumMarginEnd"/>
              <VBox>
                <Text text="₹45,200" class="vrMetricValue"/>
                <Text text="Early Payment Discounts Captured" class="vrMuted"/>
              </VBox>
            </HBox>
            <HBox alignItems="Center">
              <core:Icon src="sap-icon://warning2" size="2rem" color="#ef4444" class="sapUiMediumMarginEnd"/>
              <VBox>
                <Text text="₹12,500" class="vrMetricValue" style="color:#ef4444 !important;"/>
                <Text text="At Risk (Due to Pending GR Exceptions)" class="vrMuted"/>
              </VBox>
            </HBox>
          </VBox>
        </Panel>
      </l:Grid>
`;
cockpitView = cockpitView.replace(/<\/VBox>\s*<\/VBox>\s*<\/mvc:View>/, `    </VBox>\n${newAnalytics}\n  </VBox>\n</mvc:View>`);
fs.writeFileSync('app/vendordoclines/webapp/view/Cockpit.view.xml', cockpitView);


// ----------------------------------------------------
// 4. UPDATE CONTROLLERS
// ----------------------------------------------------
let mainCtrl = fs.readFileSync('app/vendordoclines/webapp/controller/Main.controller.js', 'utf8');

// Insert formatter and dialog methods
let newMethods = `
    formatRecommendation: function(reason) {
      if (!reason) return "Review manually";
      const r = reason.toLowerCase();
      if (r.includes('price')) return "Step 1: Contact Vendor for Price Adjustment.\\nStep 2: Await Credit Note.";
      if (r.includes('quantity')) return "Step 1: Contact Warehouse to verify GR.\\nStep 2: Request updated invoice if shortage confirmed.";
      if (r.includes('not found') || r.includes('missing')) return "Step 1: Check SAP for pending GR.\\nStep 2: Expedite warehouse receipt.";
      return "Review PO and GR for discrepancies.";
    },
    
    onCloseDialog: function() {
      if (this.oDetailsDialog) {
        this.oDetailsDialog.close();
      }
    },
    
    onInvoicePress: function(oEvent) {
      let oCtx = oEvent.getSource().getBindingContext();
      if (!oCtx) {
         oCtx = oEvent.getSource().getBindingContext("miro");
      }
      if (!oCtx) return;
      
      const invoiceNo = oCtx.getProperty("vendorInvoiceNo") || oCtx.getProperty("invoiceNo");
      
      if (!this.oDetailsDialog) {
        sap.ui.core.Fragment.load({
          name: "vendordoclines.view.InvoiceDetails",
          controller: this
        }).then(function (oDialog) {
          this.oDetailsDialog = oDialog;
          this.getView().addDependent(this.oDetailsDialog);
          this.oDetailsDialog.setBindingContext(oCtx);
          // If it's the miro model context, we need to bind explicitly to miro model in the fragment
          const modelName = oEvent.getSource().getBindingContext("miro") ? "miro" : undefined;
          this.oDetailsDialog.setBindingContext(oCtx, modelName);
          this.oDetailsDialog.open();
        }.bind(this));
      } else {
        const modelName = oEvent.getSource().getBindingContext("miro") ? "miro" : undefined;
        this.oDetailsDialog.setBindingContext(oCtx, modelName);
        this.oDetailsDialog.open();
      }
    },
    
    onMiroPress: function(oEvent) {
      let oCtx = oEvent.getSource().getBindingContext("miro");
      if (!oCtx) return;
      
      if (!this.oMiroDialog) {
        sap.ui.core.Fragment.load({
          name: "vendordoclines.view.MiroDetails",
          controller: this
        }).then(function (oDialog) {
          this.oMiroDialog = oDialog;
          this.getView().addDependent(this.oMiroDialog);
          this.oMiroDialog.setBindingContext(oCtx, "miro");
          this.oMiroDialog.open();
        }.bind(this));
      } else {
        this.oMiroDialog.setBindingContext(oCtx, "miro");
        this.oMiroDialog.open();
      }
    },
    
    onCloseMiroDialog: function() {
      if (this.oMiroDialog) {
        this.oMiroDialog.close();
      }
    },
`;

mainCtrl = mainCtrl.replace(/_refreshSubViews: function \(\) \{/, `${newMethods}\n    _refreshSubViews: function () {`);
fs.writeFileSync('app/vendordoclines/webapp/controller/Main.controller.js', mainCtrl);


let miroCtrl = fs.readFileSync('app/vendordoclines/webapp/controller/MIROWorkbench.controller.js', 'utf8');
// Fix "Posted Today" logic in MIROWorkbench to format dates properly
miroCtrl = miroCtrl.replace(/postedAt: h\.createdAt/, `postedAt: new Date(h.createdAt).toLocaleDateString()`);
miroCtrl = miroCtrl.replace(/postedAt: new Date\(h\.createdAt\)\.toLocaleTimeString\(\)/, `postedAt: new Date(h.createdAt).toLocaleDateString()`);

// Inject the same press handlers so the fragment works directly inside MIRO Workbench view
miroCtrl = miroCtrl.replace(/loadKpis: function\(\) \{/, `
    onInvoicePress: function(oEvent) {
      this.getOwnerComponent().byId("mainView").getController().onInvoicePress(oEvent);
    },
    onMiroPress: function(oEvent) {
      this.getOwnerComponent().byId("mainView").getController().onMiroPress(oEvent);
    },
    loadKpis: function() {
`);
fs.writeFileSync('app/vendordoclines/webapp/controller/MIROWorkbench.controller.js', miroCtrl);

console.log("Success");
