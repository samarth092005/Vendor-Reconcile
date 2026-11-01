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
  });