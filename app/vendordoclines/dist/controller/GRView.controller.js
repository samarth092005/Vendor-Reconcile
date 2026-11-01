sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, MessageBox, MessageToast, Fragment) {
    "use strict";
  
    return Controller.extend("vendordoclines.controller.GRView", {
        
        formatPendingQty: function(poQty, rcvQty) {
            var q1 = parseFloat(poQty) || 0;
            var q2 = parseFloat(rcvQty) || 0;
            return (q1 - q2).toFixed(3);
        },
        formatQualityState: function(status) {
            if (status === "Accepted") return "Success";
            if (status === "Rejected") return "Error";
            return "Warning";
        },
        formatHasImage: function(imageStr) {
            return !!imageStr;
        },

        onPostGR: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext();
            this._currentPoId = oCtx.getProperty("ID");
            const poQty = oCtx.getProperty("poQty");
            const rcvQty = oCtx.getProperty("receivedQty");
            this._pendingQty = poQty - rcvQty;
            this._productImageBase64 = null;
            
            if (!this.oDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "vendordoclines.view.GRDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.oDialog = oDialog;
                    this.getView().addDependent(this.oDialog);
                    this._setupAndOpenDialog();
                }.bind(this));
            } else {
                this._setupAndOpenDialog();
            }
        },
        
        _setupAndOpenDialog: function() {
            this.byId("grQty").setValue(this._pendingQty.toString());
            this.byId("grPlant").setValue("1010");
            this.byId("grStockType").setSelectedKey("Unrestricted Use");
            this.byId("grQualityStatus").setSelectedKey("Accepted");
            this.byId("defectBox").setVisible(false);
            this.byId("grDefectCode").setSelectedKey("");
            this.byId("grRemarks").setValue("");
            this.byId("grImageUploader").clear();
            this.oDialog.open();
        },
        
        onQualityStatusChange: function(oEvent) {
            const key = oEvent.getParameter("selectedItem").getKey();
            if (key === "Rejected") {
                this.byId("defectBox").setVisible(true);
            } else {
                this.byId("defectBox").setVisible(false);
            }
        },
        
        onImageUpload: function(oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    this._productImageBase64 = e.target.result; // "data:image/jpeg;base64,..."
                }.bind(this);
                reader.readAsDataURL(file);
            }
        },
        
        onCancelGR: function() {
            this.oDialog.close();
        },
        
        onConfirmGR: function() {
            const qty = parseFloat(this.byId("grQty").getValue());
            const plant = this.byId("grPlant").getValue();
            const stockType = this.byId("grStockType").getSelectedKey();
            const qualityStatus = this.byId("grQualityStatus").getSelectedKey();
            const defectCode = this.byId("grDefectCode").getSelectedKey();
            const remarks = this.byId("grRemarks").getValue();
            
            if (!qty) return MessageBox.error("Quantity is required");
            if (qualityStatus === "Rejected" && !defectCode) {
                return MessageBox.error("Defect Code is required when Quality Status is Rejected.");
            }
            if (qualityStatus === "Rejected" && !this._productImageBase64) {
                return MessageBox.error("Product Image upload is mandatory for Rejected goods as evidence.");
            }
            
            fetch("/api/v1/postGR", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    poId: this._currentPoId, 
                    grQty: qty, 
                    plant: plant,
                    stockType: stockType,
                    qualityStatus: qualityStatus,
                    defectCode: defectCode,
                    inspectorRemarks: remarks,
                    productImage: this._productImageBase64
                })
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error.message);
                MessageToast.show("Goods Receipt & Quality Inspection posted successfully!");
                this.getView().getModel().refresh();
                this.oDialog.close();
            })
            .catch(err => MessageBox.error(err.message));
        },
        
        onViewImage: function(oEvent) {
            const oCtx = oEvent.getSource().getBindingContext();
            const base64 = oCtx.getProperty("productImage");
            if (!base64) return;
            
            const dialog = new sap.m.Dialog({
                title: "Inspection Evidence",
                contentWidth: "600px",
                contentHeight: "400px",
                content: new sap.m.Image({ src: base64, width: "100%" }),
                endButton: new sap.m.Button({ text: "Close", press: function() { dialog.close(); } }),
                afterClose: function() { dialog.destroy(); }
            });
            this.getView().addDependent(dialog);
            dialog.open();
        }
    });
});
