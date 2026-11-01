sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("vendordoclines.controller.GRObjectPage", {
        onInit: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("grObjectPage").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            const poId = oEvent.getParameter("arguments").poId;
            this.getView().bindElement({
                path: "/PurchaseOrders(" + poId + ")",
                parameters: { $$operationMode: 'Server' }
            });
            // Reset fields
            this.byId("grQty").setValue("");
            this.byId("grQualityStatus").setSelectedKey("Accepted");
            this.byId("grStockType").setSelectedKey("Unrestricted Use");
            this.byId("grDefectCode").setSelectedKey("");
            this.byId("grRemarks").setValue("");
            this.byId("grImageUploader").clear();
            this.base64Image = null;
            this.onQualityStatusChange();
        },

        formatPendingQty: function (poQty, receivedQty) {
      if (!poQty) return "0.000";
      const q = parseFloat(poQty) || 0;
      const r = parseFloat(receivedQty) || 0;
      return (q - r).toFixed(3);
    },
    onQualityStatusChange: function () {
            const status = this.byId("grQualityStatus").getSelectedKey();
            const showDefect = (status === 'Rejected' || status === 'Blocked');
            this.byId("grDefectCodeLabel").setVisible(showDefect);
            this.byId("grDefectCode").setVisible(showDefect);
            if (showDefect) {
                this.byId("grStockType").setSelectedKey("Blocked Stock");
            } else if (status === 'Accepted') {
                this.byId("grStockType").setSelectedKey("Unrestricted Use");
            }
        },

        onImageUpload: function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (!file) {
                this.base64Image = null;
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                this.base64Image = e.target.result;
            };
            reader.readAsDataURL(file);
        },

        onConfirmGR: function () {
            const oContext = this.getView().getBindingContext();
            if (!oContext) return;
            const obj = oContext.getObject();

            const qty = this.byId("grQty").getValue();
            const plant = this.byId("grPlant").getValue();
            const stockType = this.byId("grStockType").getSelectedKey();
            const qualityStatus = this.byId("grQualityStatus").getSelectedKey();
            const defectCode = this.byId("grDefectCode").getSelectedKey();
            const remarks = this.byId("grRemarks").getValue();

            if (!qty || parseFloat(qty) <= 0) {
                MessageBox.error("Please enter a valid quantity.");
                return;
            }

            if ((qualityStatus === 'Rejected' || qualityStatus === 'Blocked') && !defectCode) {
                MessageBox.error("Defect Code is mandatory when Goods are Rejected or Blocked.");
                return;
            }

            const payload = {
                poId: obj.ID,
                poNum: obj.purchaseOrder,
                poItem: obj.poItem,
                grQty: parseFloat(qty),
                plant: plant,
                stockType: stockType,
                qualityStatus: qualityStatus,
                defectCode: defectCode || null,
                inspectorRemarks: remarks || null,
                productImage: this.base64Image || null
            };

            fetch("/api/v1/postGR", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).then(r => r.json()).then(data => {
                if (data.error) throw new Error(data.error.message);
                MessageToast.show("Goods Receipt successfully posted with Quality Status!");
                this.onCancelGR(); // return to list
            }).catch(err => {
                MessageBox.error(err.message);
            });
        },

        onCancelGR: function () {
            this.getOwnerComponent().getRouter().navTo("main");
        }
    });
});
