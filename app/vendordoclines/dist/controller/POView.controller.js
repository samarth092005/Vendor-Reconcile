sap.ui.define([
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
  });