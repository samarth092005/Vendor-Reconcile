const fs = require('fs');
const path = require('path');

const write = (file, content) => {
    const fullPath = path.join('app/vendordoclines/webapp', file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
};

// --- VIEWS ---

write('view/PRView.view.xml', `<mvc:View controllerName="vendordoclines.controller.PRView" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:core="sap.ui.core">
  <VBox class="sapUiLargeMargin">
    <HBox justifyContent="SpaceBetween" alignItems="Center" class="sapUiSmallMarginBottom">
      <Title text="Purchase Requisitions (PR)" level="H2"/>
      <Button text="Create New PR" type="Emphasized" press="onCreatePR" icon="sap-icon://add"/>
    </HBox>
    <Table class="sapMListTbl" items="{ path: '/PurchaseRequisitions', parameters: { $$operationMode: 'Server' }, sorter: { path: 'createdAt', descending: true } }">
      <columns>
        <Column><Text text="PR Number"/></Column>
        <Column><Text text="Material"/></Column>
        <Column><Text text="Quantity"/></Column>
        <Column><Text text="Amount"/></Column>
        <Column><Text text="Status"/></Column>
        <Column><Text text="PO Reference"/></Column>
      </columns>
      <items>
        <ColumnListItem>
          <cells>
            <Text text="{prNumber}" class="vrCode"/>
            <Text text="{material}"/>
            <Text text="{qty}"/>
            <Text text="{amount}"/>
            <ObjectStatus text="{status}" state="{= \${status} === 'APPROVED' ? 'Success' : 'Warning' }"/>
            <Text text="{poReference}"/>
          </cells>
        </ColumnListItem>
      </items>
    </Table>
  </VBox>
</mvc:View>`);

write('view/POView.view.xml', `<mvc:View controllerName="vendordoclines.controller.POView" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:core="sap.ui.core">
  <VBox class="sapUiLargeMargin">
    
    <Title text="Purchase Requisitions (Pending Approval)" level="H2" class="sapUiSmallMarginBottom"/>
    <Table class="sapMListTbl sapUiMediumMarginBottom" items="{ path: '/PurchaseRequisitions', filters: [{path: 'status', operator: 'EQ', value1: 'PENDING'}], parameters: { $$operationMode: 'Server' } }">
      <columns>
        <Column><Text text="PR Number"/></Column>
        <Column><Text text="Material"/></Column>
        <Column><Text text="Quantity"/></Column>
        <Column><Text text="Amount"/></Column>
        <Column><Text text="Action"/></Column>
      </columns>
      <items>
        <ColumnListItem>
          <cells>
            <Text text="{prNumber}" class="vrCode"/>
            <Text text="{material}"/>
            <Text text="{qty}"/>
            <Text text="{amount}"/>
            <Button text="Convert to PO" press="onApprovePR" type="Emphasized"/>
          </cells>
        </ColumnListItem>
      </items>
    </Table>

    <Title text="Purchase Orders" level="H2" class="sapUiSmallMarginBottom"/>
    <Table class="sapMListTbl" items="{ path: '/PurchaseOrders', parameters: { $$operationMode: 'Server' }, sorter: { path: 'createdAt', descending: true } }">
      <columns>
        <Column><Text text="PO Number"/></Column>
        <Column><Text text="Item"/></Column>
        <Column><Text text="Supplier"/></Column>
        <Column><Text text="Material"/></Column>
        <Column><Text text="Quantity"/></Column>
        <Column><Text text="Amount"/></Column>
        <Column><Text text="Status"/></Column>
      </columns>
      <items>
        <ColumnListItem>
          <cells>
            <Text text="{purchaseOrder}" class="vrCode"/>
            <Text text="{poItem}"/>
            <Text text="{supplier}"/>
            <Text text="{material}"/>
            <Text text="{poQty}"/>
            <Text text="{poAmount}"/>
            <ObjectStatus text="{status}" state="{= \${status} === 'CREATED' ? 'Success' : 'Information' }"/>
          </cells>
        </ColumnListItem>
      </items>
    </Table>

  </VBox>
</mvc:View>`);

write('view/GRView.view.xml', `<mvc:View controllerName="vendordoclines.controller.GRView" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:core="sap.ui.core">
  <VBox class="sapUiLargeMargin">
    
    <Title text="Pending Goods Receipts (Open POs)" level="H2" class="sapUiSmallMarginBottom"/>
    <Table class="sapMListTbl sapUiMediumMarginBottom" items="{ path: '/PurchaseOrders', parameters: { $$operationMode: 'Server' } }">
      <columns>
        <Column><Text text="PO Number"/></Column>
        <Column><Text text="Item"/></Column>
        <Column><Text text="Supplier"/></Column>
        <Column><Text text="Material"/></Column>
        <Column><Text text="Pending Qty"/></Column>
        <Column><Text text="Action"/></Column>
      </columns>
      <items>
        <ColumnListItem>
          <cells>
            <Text text="{purchaseOrder}" class="vrCode"/>
            <Text text="{poItem}"/>
            <Text text="{supplier}"/>
            <Text text="{material}"/>
            <Text text="{= \${poQty} - \${receivedQty} }"/>
            <Button text="Post Goods Receipt (MIGO)" press="onPostGR" type="Accept" enabled="{= \${receivedQty} < \${poQty} }"/>
          </cells>
        </ColumnListItem>
      </items>
    </Table>

    <Title text="Goods Receipts History" level="H2" class="sapUiSmallMarginBottom"/>
    <Table class="sapMListTbl" items="{ path: '/GrirSnapshot', parameters: { $$operationMode: 'Server' }, sorter: { path: 'createdAt', descending: true } }">
      <columns>
        <Column><Text text="GR Number"/></Column>
        <Column><Text text="PO Number"/></Column>
        <Column><Text text="PO Item"/></Column>
        <Column><Text text="Supplier"/></Column>
        <Column><Text text="Received Qty"/></Column>
        <Column><Text text="GR/IR Amount"/></Column>
        <Column><Text text="Plant"/></Column>
      </columns>
      <items>
        <ColumnListItem>
          <cells>
            <Text text="{grNumber}" class="vrCode"/>
            <Text text="{purchaseOrder}"/>
            <Text text="{purchaseOrderItem}"/>
            <Text text="{supplier}"/>
            <Text text="{goodsReceiptQty}"/>
            <Text text="{grirAmount}"/>
            <Text text="{plant}"/>
          </cells>
        </ColumnListItem>
      </items>
    </Table>

  </VBox>
</mvc:View>`);

write('view/VendorView.view.xml', `<mvc:View controllerName="vendordoclines.controller.VendorView" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:core="sap.ui.core">
  <VBox class="sapUiLargeMargin">
    
    <Title text="My Invoices (Vendor Portal)" level="H2" class="sapUiSmallMarginBottom"/>
    <Table class="sapMListTbl" items="{ path: '/VendorDocLines', parameters: { $$operationMode: 'Server' }, sorter: { path: 'createdAt', descending: true } }">
      <columns>
        <Column><Text text="Invoice No"/></Column>
        <Column><Text text="Date"/></Column>
        <Column><Text text="Amount"/></Column>
        <Column><Text text="PO Number"/></Column>
        <Column><Text text="Approval Status"/></Column>
        <Column><Text text="Payment Status"/></Column>
      </columns>
      <items>
        <ColumnListItem>
          <cells>
            <Text text="{vendorInvoiceNo}" class="vrCode"/>
            <Text text="{invoiceDate}"/>
            <Text text="{invoiceAmount}"/>
            <Text text="{poReference}"/>
            <ObjectStatus text="{= \${approvedForPayment} ? 'Approved' : 'Pending Verification' }" state="{= \${approvedForPayment} ? 'Success' : 'Warning' }"/>
            <ObjectStatus text="{paymentStatus}" state="{= \${paymentStatus} === 'PAID' ? 'Success' : (\${paymentStatus} === 'POSTED' ? 'Information' : 'Warning') }"/>
          </cells>
        </ColumnListItem>
      </items>
    </Table>

  </VBox>
</mvc:View>`);

// --- CONTROLLERS ---

write('controller/PRView.controller.js', `sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/Label",
    "sap/ui/layout/VerticalLayout"
  ], function (Controller, MessageBox, MessageToast, Dialog, Button, Input, Label, VerticalLayout) {
    "use strict";
  
    return Controller.extend("vendordoclines.controller.PRView", {
      onCreatePR: function () {
        if (!this.oDialog) {
          this.oDialog = new Dialog({
            title: "Create Purchase Requisition",
            content: new VerticalLayout({
              content: [
                new Label({ text: "Material Code" }),
                new Input({ id: "prMaterial", placeholder: "e.g. 40000501" }),
                new Label({ text: "Quantity" }),
                new Input({ id: "prQty", placeholder: "e.g. 100", type: "Number" }),
                new Label({ text: "Estimated Amount" }),
                new Input({ id: "prAmount", placeholder: "e.g. 50000", type: "Number" })
              ]
            }).addStyleClass("sapUiSmallMargin"),
            beginButton: new Button({
              type: "Emphasized",
              text: "Submit",
              press: function () {
                const material = sap.ui.getCore().byId("prMaterial").getValue();
                const qty = parseFloat(sap.ui.getCore().byId("prQty").getValue());
                const amount = parseFloat(sap.ui.getCore().byId("prAmount").getValue());
  
                if (!material || !qty || !amount) {
                  return MessageBox.error("Please fill all fields");
                }
  
                fetch("/api/v1/createPR", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ material, qty, amount })
                })
                .then(r => r.json())
                .then(data => {
                  if (data.error) throw new Error(data.error.message);
                  MessageToast.show("PR created successfully!");
                  this.getView().getModel().refresh();
                  this.oDialog.close();
                })
                .catch(err => MessageBox.error(err.message));
              }.bind(this)
            }),
            endButton: new Button({
              text: "Cancel",
              press: function () { this.oDialog.close(); }.bind(this)
            })
          });
          this.getView().addDependent(this.oDialog);
        }
        this.oDialog.open();
      }
    });
  });`);

write('controller/POView.controller.js', `sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/Label",
    "sap/ui/layout/VerticalLayout"
  ], function (Controller, MessageBox, MessageToast, Dialog, Button, Input, Label, VerticalLayout) {
    "use strict";
  
    return Controller.extend("vendordoclines.controller.POView", {
      onApprovePR: function (oEvent) {
        const oCtx = oEvent.getSource().getBindingContext();
        const prId = oCtx.getProperty("ID");
        const material = oCtx.getProperty("material");
        
        if (!this.oDialog) {
          this.oDialog = new Dialog({
            title: "Convert PR to Purchase Order",
            content: new VerticalLayout({
              content: [
                new Label({ text: "Supplier Code (Vendor)" }),
                new Input({ id: "poSupplier", placeholder: "e.g. 1000" }),
                new Label({ text: "PO Number (Leave blank to auto-generate)" }),
                new Input({ id: "poNumber", placeholder: "e.g. 4500001234" })
              ]
            }).addStyleClass("sapUiSmallMargin"),
            beginButton: new Button({
              type: "Emphasized",
              text: "Create PO",
              press: function () {}
            }),
            endButton: new Button({
              text: "Cancel",
              press: function () { this.oDialog.close(); }.bind(this)
            })
          });
          this.getView().addDependent(this.oDialog);
        }
        
        sap.ui.getCore().byId("poSupplier").setValue("");
        sap.ui.getCore().byId("poNumber").setValue("");
        
        const btn = this.oDialog.getBeginButton();
        if(btn.mEventRegistry.press) btn.detachPress(btn.mEventRegistry.press[0].fFunction);
        btn.attachPress(() => {
            const supplier = sap.ui.getCore().byId("poSupplier").getValue();
            const poNum = sap.ui.getCore().byId("poNumber").getValue() || undefined;
            if (!supplier) return MessageBox.error("Supplier is required");
            fetch("/api/v1/createPO", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prId, purchaseOrder: poNum, supplier })
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error.message);
                MessageToast.show("PO created successfully!");
                this.getView().getModel().refresh();
                this.oDialog.close();
            })
            .catch(err => MessageBox.error(err.message));
        });
        
        this.oDialog.open();
      }
    });
  });`);

write('controller/GRView.controller.js', `sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/Label",
    "sap/ui/layout/VerticalLayout"
  ], function (Controller, MessageBox, MessageToast, Dialog, Button, Input, Label, VerticalLayout) {
    "use strict";
  
    return Controller.extend("vendordoclines.controller.GRView", {
      onPostGR: function (oEvent) {
        const oCtx = oEvent.getSource().getBindingContext();
        const poId = oCtx.getProperty("ID");
        const poQty = oCtx.getProperty("poQty");
        const rcvQty = oCtx.getProperty("receivedQty");
        const pendingQty = poQty - rcvQty;
        
        if (!this.oDialog) {
          this.oDialog = new Dialog({
            title: "Post Goods Receipt (MIGO)",
            content: new VerticalLayout({
              content: [
                new Label({ text: "Quantity Received" }),
                new Input({ id: "grQty", type: "Number" }),
                new Label({ text: "Plant" }),
                new Input({ id: "grPlant", placeholder: "e.g. 1010" })
              ]
            }).addStyleClass("sapUiSmallMargin"),
            beginButton: new Button({
              type: "Accept",
              text: "Post GR",
              press: function () {}
            }),
            endButton: new Button({
              text: "Cancel",
              press: function () { this.oDialog.close(); }.bind(this)
            })
          });
          this.getView().addDependent(this.oDialog);
        }
        
        sap.ui.getCore().byId("grQty").setValue(pendingQty.toString());
        sap.ui.getCore().byId("grPlant").setValue("1010");
        
        const btn = this.oDialog.getBeginButton();
        if(btn.mEventRegistry.press) btn.detachPress(btn.mEventRegistry.press[0].fFunction);
        btn.attachPress(() => {
            const qty = parseFloat(sap.ui.getCore().byId("grQty").getValue());
            const plant = sap.ui.getCore().byId("grPlant").getValue();
            if (!qty) return MessageBox.error("Quantity is required");
            fetch("/api/v1/postGR", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ poId, grQty: qty, plant })
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error.message);
                MessageToast.show("Goods Receipt posted successfully!");
                this.getView().getModel().refresh();
                this.oDialog.close();
            })
            .catch(err => MessageBox.error(err.message));
        });
        
        this.oDialog.open();
      }
    });
  });`);

write('controller/VendorView.controller.js', `sap.ui.define([
    "sap/ui/core/mvc/Controller"
  ], function (Controller) {
    "use strict";
    return Controller.extend("vendordoclines.controller.VendorView", {});
  });`);

console.log("Success");
