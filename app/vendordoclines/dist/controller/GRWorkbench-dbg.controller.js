sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
  return Controller.extend("vendordoclines.controller.GRWorkbench", {
    onInit: function () {
      const user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
      if (!user.username) return this.getOwnerComponent().getRouter().navTo("login");
      
      const model = new JSONModel({
        pendingGR: 0,
        grPostedToday: 0,
        grirClearing: 0,
        shortDeliveries: 0,
        returns: 2,
        poCoverage: 100,
        grVsPOPct: 100,
        grirClearedPct: 100,
        onTimePct: 100,
        openGRs: [],
        postedGRs: [],
        grirItems: [],
        returnsList: [
          { returnDoc: "800010203", poNo: "450000012", qty: "5.000", defectCode: "001 - Damaged", status: "Pending Pickup" },
          { returnDoc: "800010204", poNo: "450000018", qty: "10.000", defectCode: "003 - Quality Fail", status: "Dispatched" }
        ],
        gateEntries: [
          { gatePass: "GP-2026-901", vehicleNo: "MH-12-AB-1234", vendor: "Vasavi Castings", entryTime: "08:15 AM", status: "Arrived", statusState: "Warning" },
          { gatePass: "GP-2026-902", vehicleNo: "KA-01-XY-9876", vendor: "ABC Suppliers", entryTime: "09:30 AM", status: "Verified", statusState: "Success" }
        ]
      });
      this.getView().setModel(model, "gr");

      try {
        const router = this.getOwnerComponent().getRouter();
        router.getRoute("main").attachPatternMatched(this.loadKpis, this);
      } catch (err) {}
      
      this.loadKpis();
    },

    loadKpis: function () {
      const model = this.getView().getModel("gr");
      
      Promise.all([
        fetch("/api/v1/PurchaseOrders").then(r => r.json()),
        fetch("/api/v1/GrirSnapshot").then(r => r.json())
      ]).then(([pos, grir]) => {
        const poList = pos.value || [];
        const grirList = grir.value || [];
        
        const openGRs = poList.filter(po => po.status === 'SENT' || po.status === 'DISPATCHED').map(po => ({
          ID: po.ID,
          purchaseOrder: po.purchaseOrder,
          poItem: po.poItem || '10',
          supplier: po.supplier,
          material: po.material || 'Materials',
          poQty: po.poQty,
          receivedQty: po.receivedQty || 0,
          expectedDate: po.modifiedAt ? new Date(po.modifiedAt).toLocaleDateString() : 'Today',
          status: po.status === 'DISPATCHED' ? 'Dispatched' : 'Awaiting GR',
          statusState: po.status === 'DISPATCHED' ? 'Information' : 'Warning'
        }));
        
        const postedGRs = poList.filter(po => po.status === 'GR_POSTED').map(po => ({
          grDoc: '5000' + po.purchaseOrder.replace(/[^0-9]/g, '').slice(-6),
          poNo: po.purchaseOrder,
          vendor: po.supplier,
          qtyPosted: po.receivedQty,
          postingDate: new Date(po.modifiedAt).toLocaleDateString(),
          miroStatus: 'GR Received',
          miroState: 'Success'
        }));
        
        const grirItems = grirList.map(item => ({
          poNo: item.purchaseOrder,
          grDate: item.modifiedAt ? new Date(item.modifiedAt).toLocaleDateString() : 'Recent',
          grAmount: '₹' + Number(item.grirAmount).toLocaleString('en-IN'),
          miroStatus: 'Pending Match',
          miroState: 'Warning',
          daysPending: 1
        }));
        
        model.setProperty("/pendingGR", openGRs.length);
        model.setProperty("/grPostedToday", postedGRs.length);
        model.setProperty("/grirClearing", grirItems.length);
        
        model.setProperty("/openGRs", openGRs);
        model.setProperty("/postedGRs", postedGRs);
        model.setProperty("/grirItems", grirItems);
        
      }).catch(err => {
        console.error("Error loading GR KPIs:", err);
      });
    },

    
      formatHasImage: function(imageStr) {
        return !!imageStr;
    },

    _parseNumber: function(val) {
      if (!val) return 0;
      if (typeof val === "number") return val;
      return parseFloat(val.toString().replace(/,/g, '')) || 0;
    },

    formatPendingQty: function (poQty, receivedQty) {
      const q = this._parseNumber(poQty);
      const r = this._parseNumber(receivedQty);
      return (q - r).toFixed(3);
    },
    formatPostGREnabled: function (poQty, receivedQty) {
      const q = this._parseNumber(poQty);
      const r = this._parseNumber(receivedQty);
      return r < q;
    },
    onNavigateToObjectPage: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext("gr") || oEvent.getSource().getBindingContext();
      if (!oContext) return;
      const poId = oContext.getProperty("ID");
      this.getOwnerComponent().getRouter().navTo("grObjectPage", { poId: poId });
    },
      
    onQuickActionGR: function() {
      sap.m.MessageBox.information("Please click the 'Post Goods Receipt (MIGO)' button directly on a specific Purchase Order row in the Open GR Tasks worklist above.");
    },

    onPostGRDialog: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext("gr") || oEvent.getSource().getBindingContext();
      if (!oContext) return;
      
      this._currentPoId = oContext.getProperty("ID");
      const poQty = parseFloat(oContext.getProperty("poQty")) || 0;
      const receivedQty = parseFloat(oContext.getProperty("receivedQty")) || 0;
      this._pendingQty = Math.max(0, poQty - receivedQty);

      if (!this.oDialog) {
          sap.ui.core.Fragment.load({
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
        if (this.byId("grQty")) this.byId("grQty").setValue(this._pendingQty.toString());
        if (this.byId("grPlant")) this.byId("grPlant").setValue("1010");
        if (this.byId("grStockType")) this.byId("grStockType").setSelectedKey("Unrestricted Use");
        if (this.byId("grQualityStatus")) this.byId("grQualityStatus").setSelectedKey("Accepted");
        if (this.byId("defectBox")) this.byId("defectBox").setVisible(false);
        if (this.byId("grDefectCode")) this.byId("grDefectCode").setSelectedKey("");
        if (this.byId("grRemarks")) this.byId("grRemarks").setValue("");
        const uploader = this.byId("grImageUploader");
        if (uploader && uploader.clear) uploader.clear();
        this._productImageBase64 = null;
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
                  this._productImageBase64 = e.target.result;
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
              this.loadKpis();
              this.oDialog.close();
          })
          .catch(err => MessageBox.error(err.message));
      },
      
      onViewImage: function(oEvent) {
          const oCtx = oEvent.getSource().getBindingContext("gr");
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
      },

      onSyncS21: function () {
      sap.m.MessageToast.show("Initiating real-time sync with S21 ERP...");
      fetch("/api/v1/syncWithS21", { method: "POST" })
        .then(r => r.json())
        .then(data => {
            if(data.error) throw new Error(data.error.message);
            sap.m.MessageBox.success("S21 Sync Completed! " + (data.value || ''));
            this.loadKpis(); this.getView().getModel().refresh();
        })
        .catch(err => sap.m.MessageBox.error(err.message));
    },
    
      onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("home");
    },

    onLogout: function () {
      const oRouter = this.getOwnerComponent().getRouter();
      MessageBox.confirm("Are you sure you want to log out?", {
        title: "Confirm Logout",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            sessionStorage.removeItem("vr_user");
            oRouter.navTo("login");
          }
        }
      });
    },

    onMockAction: function (oEvent) {
      const sText = oEvent.getSource().getText();
      sap.m.MessageToast.show("Action Executed: " + sText + "\n(This is a simulated action for the GR Cockpit)");
    }
  });
});
