sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/List",
  "sap/m/FeedListItem",
  "sap/m/FeedInput",
  "sap/m/VBox",
  "sap/ui/model/Sorter"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Button, List, FeedListItem, FeedInput, VBox, Sorter) {
  "use strict";

  return Controller.extend("vendordoclines.controller.MIROWorkbench", {
    onInit: function () {
      const user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
      if (!user.username) {
        this.getOwnerComponent().getRouter().navTo("login");
        return;
      }
      
      this._currentUser = user.username || "AP_Clerk";
      
      const model = new JSONModel({
        pendingVerification: 0, 
        blockedInvoices: 0, 
        parkedInvoices: 0, 
        postedTodayCount: 0,
        pendingList: [],
        parkedList: [],
        blockedList: [],
        postedToday: [],
        currentTab: "PENDING",
        groupByReason: false
      });
      this.getView().setModel(model, "miro");
      
      this._chatData = {}; 
      this.loadKpis();
    },

    onRefreshQueues: function () {
      var oBtn = this.byId("btnWorkbenchRefresh");
      if (oBtn) oBtn.setBusy(true);
      sap.ui.core.BusyIndicator.show(0);
      this.loadKpis(function () {
        if (oBtn) oBtn.setBusy(false);
        sap.ui.core.BusyIndicator.hide();
        MessageToast.show("AP Workbench Queues Refreshed");
      });
    },

    loadKpis: function (fnCallback) {
      const model = this.getView().getModel("miro");
      
      Promise.all([
        fetch("/api/v1/VendorDocLines?_t=" + Date.now()).then(r => r.json()),
        fetch("/api/v1/MatchResults?_t=" + Date.now()).then(r => r.json())
      ]).then(([lines, results]) => {
        const rMap = new Map();
        results.value.forEach(r => {
          const existing = rMap.get(r.vendorDocLine_ID);
          if (!existing || (r.outcomeCode.indexOf('UNMATCHED') !== -1 && existing.outcomeCode.indexOf('MATCHED') !== -1)) {
            rMap.set(r.vendorDocLine_ID, r);
          }
        });
        
        const pending = [];
        const parked = [];
        const blocked = [];
        const posted = [];
        
        lines.value.forEach(line => {
          const r = rMap.get(line.ID);
          const code = r?.outcomeCode ?? "UNMATCHED";
          const formattedAmt = "₹" + Number(line.invoiceAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
          const varianceRaw = r?.amountDelta || 0;
          const formattedDelta = "₹" + Number(varianceRaw).toLocaleString("en-IN", { minimumFractionDigits: 2 });
          
          let aiScore = 75;
          let aiScoreState = "Warning";
          let demoUseCase = "Use Case: Standard Review Required";
          let aiSuggestion = "Review 3-Way match & ledger details.";
          let aiBadge = "Manual Review Required";
          
          if (varianceRaw === 0 && r?.grNumber) {
             aiScore = 98;
             aiScoreState = "Success";
             demoUseCase = "Use Case: 3-Way Auto-Match (Zero Variance)";
             aiBadge = "Score 85+ (High Confidence Match)";
             aiSuggestion = "Exact 3-way match verified against PO and warehouse GRN with zero price variance. Recommended for instant straight-through S/4HANA MIRO auto-posting.";
          } else if (varianceRaw > 0 && varianceRaw <= 50) {
             aiScore = 92;
             aiScoreState = "Success";
             demoUseCase = "Use Case: Tolerance Auto-Cleared (Within ₹50)";
             aiBadge = "Score 85+ (Auto-Tolerance Passed)";
             aiSuggestion = "Price difference of " + formattedDelta + " is within the system tolerance limit (₹50 threshold). Recommended for one-click settlement.";
          } else if (code.includes("GR-PENDING") || (!r?.grNumber)) {
             aiScore = 85;
             aiScoreState = "Information";
             demoUseCase = "Use Case: Parked - Inbound Delivery Pending (MIGO GRN)";
             aiBadge = "Score 85+ (Ready Upon Receipt)";
             aiSuggestion = "Invoice and PO lines match perfectly, but warehouse physical goods receipt (GRN) is awaited. Keep parked; automated ping queued to dock receipt team.";
          } else if (code.includes("TAX")) {
             aiScore = 65;
             aiScoreState = "Warning";
             demoUseCase = "Use Case: Tax / GST Rate Variance";
             aiBadge = "Score <85 (Tax Adjustment)";
             aiSuggestion = "Tax slab discrepancy detected (e.g. 18% billed vs 12% PO line). Update HSN/SAC code before posting or confirm vendor tax exemption.";
          } else if (varianceRaw > 50 && varianceRaw < 5000) {
             aiScore = 60;
             aiScoreState = "Warning";
             demoUseCase = "Use Case: Unit Price Discrepancy";
             aiBadge = "Score <85 (Price Variance)";
             aiSuggestion = "Unit price variance of " + formattedDelta + " exceeds auto-tolerance threshold. Buyer approval or price variance sign-off required.";
          } else if (varianceRaw >= 5000) {
             aiScore = 25;
             aiScoreState = "Error";
             demoUseCase = "Use Case: Substantial Variance / Dispute";
             aiBadge = "Score <85 (Debit Note Required)";
             aiSuggestion = "Significant amount variance of " + formattedDelta + " flagged. Block invoice payment and issue vendor debit note or request amended bill.";
          } else if (code.includes("QTY")) {
             aiScore = 40;
             aiScoreState = "Error";
             demoUseCase = "Use Case: Billed Quantity Exceeds GRN";
             aiBadge = "Score <85 (Quantity Mismatch)";
             aiSuggestion = "Billed quantity exceeds warehouse GR receipt: Coordinate with logistics.";
          }
          
          const itemData = {
            id: line.ID,
            invoiceNo: line.vendorInvoiceNo,
            vendor: line.vendorName || line.sourceVendorCode || "Vendor",
            poNo: line.poReference || "N/A",
            grStatus: r?.grNumber ? "GR Posted" : "No GR (Pending)",
            grState: r?.grNumber ? "Success" : "Warning",
            amount: formattedAmt,
            variance: formattedDelta,
            varianceRaw: varianceRaw,
            blockReason: code.replace("UNMATCHED/", ""),
            status: line.paymentStatus || 'UNPAID',
            aiScore: aiScore,
            aiScoreState: aiScoreState,
            aiBadge: aiBadge,
            demoUseCase: demoUseCase,
            aiSuggestion: aiSuggestion
          };

          if (line.paymentStatus === 'APPROVED' || line.approvedForPayment) {
            posted.push(itemData);
          } else if (line.paymentStatus === 'BLOCKED') {
            blocked.push(itemData);
          } else if (line.paymentStatus === 'PARKED') {
            parked.push(itemData);
          } else {
            pending.push(itemData);
          }
        });
        
        model.setProperty("/pendingList", pending);
        model.setProperty("/pendingVerification", pending.length);
        
        model.setProperty("/parkedList", parked);
        model.setProperty("/parkedInvoices", parked.length);
        
        model.setProperty("/blockedList", blocked);
        model.setProperty("/blockedInvoices", blocked.length);
        
        model.setProperty("/postedToday", posted);
        model.setProperty("/postedTodayCount", posted.length);
        
        this._applyGrouping();

        const targetInv = sessionStorage.getItem("vr_workbench_target_invoice");
        if (targetInv) {
          sessionStorage.removeItem("vr_workbench_target_invoice");
          const inBlocked = blocked.some(i => i.invoiceNo === targetInv);
          const inParked = parked.some(i => i.invoiceNo === targetInv);
          
          let targetTab = "PENDING";
          if (inBlocked) targetTab = "BLOCKED";
          else if (inParked) targetTab = "PARKED";
          
          model.setProperty("/currentTab", targetTab);
          const oTabs = this.byId("workbenchTabs");
          if (oTabs) oTabs.setSelectedKey(targetTab);

          const allItems = [...pending, ...parked, ...blocked];
          const matchedItem = allItems.find(i => i.invoiceNo === targetInv);
          if (matchedItem) {
            this._selectedActionItem = matchedItem;
            const dialogModel = new JSONModel(matchedItem);
            this.getView().setModel(dialogModel, "dialogData");
            const oDialog = this.byId("invoiceActionDialog");
            if (oDialog) {
              setTimeout(() => oDialog.open(), 300);
            }
          }
          
          MessageToast.show("Routed from Exceptions: Active queue " + targetTab + " for Invoice #" + targetInv);
        }
        if (typeof fnCallback === "function") fnCallback();
      }).catch(err => {
        MessageToast.show("Failed to load workbench data");
        console.error(err);
        if (typeof fnCallback === "function") fnCallback();
      });
    },

    onOpenActionDialog: function(oEvent) {
        let oCtx = oEvent.getSource().getBindingContext('miro');
        if (!oCtx) return;
        const data = oCtx.getObject();
        this._selectedActionItem = data;

        const dialogModel = new JSONModel(data);
        this.getView().setModel(dialogModel, "dialogData");

        const oDialog = this.byId("invoiceActionDialog");
        if (oDialog) oDialog.open();
    },

    onCloseActionDialog: function() {
        const oDialog = this.byId("invoiceActionDialog");
        if (oDialog) oDialog.close();
    },

    onDialogApprove: function() {
        if (!this._selectedActionItem) return;
        this._updateStatusSingle(this._selectedActionItem, "Approved (Ready for Payment)", "APPROVED", true);
        this.onCloseActionDialog();
    },

    onDialogPark: function() {
        if (!this._selectedActionItem) return;
        this._updateStatusSingle(this._selectedActionItem, "Parked", "PARKED", false);
        this.onCloseActionDialog();
    },

    onDialogBlock: function() {
        if (!this._selectedActionItem) return;
        this._updateStatusSingle(this._selectedActionItem, "Blocked", "BLOCKED", false);
        this.onCloseActionDialog();
    },

    onDialogChat: function() {
        const item = this._selectedActionItem;
        this.onCloseActionDialog();
        if (item) this._openChatForItem(item);
    },

    onDialogView3Way: function() {
        const item = this._selectedActionItem;
        this.onCloseActionDialog();
        if (item) {
            const resultId = item.id || item.ID;
            this.getOwnerComponent().getRouter().navTo("objectPage", { resultId: resultId });
        }
    },

    _updateStatusSingle: function(item, statusLabel, dbStatus, isApproved) {
        sap.ui.core.BusyIndicator.show(0);
        fetch(`/api/v1/VendorDocLines/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                paymentStatus: dbStatus,
                approvedForPayment: isApproved
            })
        }).then(() => {
            sap.ui.core.BusyIndicator.hide();
            if (isApproved) {
                fetch(`/api/v1/Exceptions?$filter=invoiceNo eq '${encodeURIComponent(item.invoiceNo)}'`)
                    .then(r => r.json())
                    .then(d => {
                        if (d && d.value && d.value.length > 0) {
                            d.value.forEach(ex => {
                                fetch("/api/v1/resolveException", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ exceptionId: ex.ID, note: "Approved and cleared in AP Workbench" })
                                }).catch(e => console.warn(e));
                            });
                        }
                    }).catch(e => console.warn(e));
            }
            MessageToast.show(`Invoice #${item.invoiceNo} marked as ${statusLabel}`);
            this.loadKpis();
        }).catch(err => {
            sap.ui.core.BusyIndicator.hide();
            MessageBox.error("Failed to update status: " + err.message);
        });
    },

    onInvoicePress: function(oEvent) {
        this.onOpenActionDialog(oEvent);
    },

    onTabSelect: function(oEvent) {
       const key = oEvent.getParameter("key");
       this.getView().getModel("miro").setProperty("/currentTab", key);
    },

    _getSelectedItems: function() {
       const tab = this.getView().getModel("miro").getProperty("/currentTab");
       let tableId = "";
       if(tab === "PENDING") tableId = "pendingTable";
       else if(tab === "PARKED") tableId = "parkedTable";
       else if(tab === "BLOCKED") tableId = "blockedTable";
       else return [];

       const oTable = this.byId(tableId);
       if(!oTable) return [];
       return oTable.getSelectedContexts().map(ctx => ctx.getObject());
    },

    _updateStatus: function(statusLabel, dbStatus, isApproved) {
       const selected = this._getSelectedItems();
       if (selected.length === 0) {
           return MessageToast.show("Please select at least one invoice.");
       }

       const promises = selected.map(item => {
           return fetch(`/api/v1/VendorDocLines/${item.id}`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                   paymentStatus: dbStatus,
                   approvedForPayment: isApproved
               })
           });
       });

       Promise.all(promises).then(() => {
           if (isApproved) {
               selected.forEach(item => {
                   fetch(`/api/v1/Exceptions?$filter=invoiceNo eq '${encodeURIComponent(item.invoiceNo)}'`)
                       .then(r => r.json())
                       .then(d => {
                           if (d && d.value && d.value.length > 0) {
                               d.value.forEach(ex => {
                                   fetch("/api/v1/resolveException", {
                                       method: "POST",
                                       headers: { "Content-Type": "application/json" },
                                       body: JSON.stringify({ exceptionId: ex.ID, note: "Approved and cleared in AP Workbench" })
                                   }).catch(e => console.warn(e));
                               });
                           }
                       }).catch(e => console.warn(e));
               });
           }
           MessageToast.show(`${selected.length} invoice(s) marked as ${statusLabel}`);
           ["pendingTable", "parkedTable", "blockedTable"].forEach(id => {
               if(this.byId(id)) this.byId(id).removeSelections(true);
           });
           this.loadKpis();
       }).catch(err => {
           MessageBox.error("Failed to update status.");
           console.error(err);
       });
    },

    onActionApprove: function() { this._updateStatus("Approved (Ready for Payment)", "APPROVED", true); },
    onActionPark: function() { this._updateStatus("Parked", "PARKED", false); },
    onActionBlock: function() { this._updateStatus("Blocked", "BLOCKED", false); },
    onActionUnpark: function() { this._updateStatus("Moved back to Smart Queue", "UNPAID", false); },

    onNavBack: function () {
        const oMainView = sap.ui.getCore().byId("container-vendordoclines---main");
        if (oMainView && oMainView.getController) {
            const mainCtrl = oMainView.getController();
            if (mainCtrl.byId("sideNavigation") && mainCtrl.byId("pageContainer")) {
                mainCtrl.byId("sideNavigation").setSelectedKey("exceptions");
                mainCtrl.byId("pageContainer").to(mainCtrl.createId("exceptions"));
                return;
            }
        }
        const oRouter = this.getOwnerComponent() && this.getOwnerComponent().getRouter();
        if (oRouter) {
            oRouter.navTo("main");
        } else {
            window.history.back();
        }
    },

    onQuickTabPending: function () { this._switchTab("PENDING"); },
    onQuickTabParked: function () { this._switchTab("PARKED"); },
    onQuickTabBlocked: function () { this._switchTab("BLOCKED"); },
    onQuickTabApproved: function () { this._switchTab("APPROVED"); },

    _switchTab: function (tabKey) {
        this.getView().getModel("miro").setProperty("/currentTab", tabKey);
        const oTabs = this.byId("workbenchTabs");
        if (oTabs) oTabs.setSelectedKey(tabKey);
    },

    onToggleGroup: function(oEvent) {
       this._applyGrouping();
    },
    
    _applyGrouping: function() {
       const isGrouped = this.getView().getModel("miro").getProperty("/groupByReason");
       const oTable = this.byId("pendingTable");
       const oBinding = oTable.getBinding("items");
       
       if (isGrouped) {
          oBinding.sort([
             new Sorter("blockReason", false, true),
             new Sorter("aiScore", true) 
          ]);
       } else {
          oBinding.sort(new Sorter("aiScore", true)); 
       }
    },

    _openChatForItem: function(invoiceData) {
       if (!invoiceData) return;
       this._currentChatInvoiceId = invoiceData.id;
       if (!this._chatData) this._chatData = {};
       
       if (!this._chatData[invoiceData.id]) {
           const suggestion = invoiceData.aiSuggestion || invoiceData.blockReason || "Reviewing potential variance and GR matching";
           const varVal = invoiceData.variance || invoiceData.delta || "₹0.00";
           this._chatData[invoiceData.id] = [{
               sender: "Reconly AI",
               icon: "sap-icon://lightbulb",
               timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
               text: `AI Assessment: ${suggestion}. Variance is ${varVal}.`
           }];
       }

       const chatModel = new JSONModel({
           invoiceNo: invoiceData.invoiceNo,
           comments: this._chatData[invoiceData.id]
       });

       if (!this._chatDialog) {
           const oList = new List({
               items: {
                   path: "chat>/comments",
                   template: new FeedListItem({
                       sender: "{chat>sender}",
                       icon: "{chat>icon}",
                       timestamp: "{chat>timestamp}",
                       text: "{chat>text}"
                   })
               }
           });
           
           const oFeedInput = new FeedInput({
               post: this.onPostComment.bind(this),
               placeholder: "Type @Buyer or @Supplier to collaborate..."
           });

           const oVBox = new VBox({ items: [oList, oFeedInput] });
           oVBox.addStyleClass("sapUiSmallMargin");

           this._chatDialog = new Dialog({
               contentWidth: "540px",
               contentHeight: "480px",
               verticalScrolling: true,
               content: [ oVBox ],
               beginButton: new Button({
                   text: "Close",
                   press: () => this._chatDialog.close()
               })
           });
           this.getView().addDependent(this._chatDialog);
       }

       this._chatDialog.setTitle("Collaboration Chat: #" + (invoiceData.invoiceNo || ""));
       this._chatDialog.setModel(chatModel, "chat");
       this._chatDialog.open();
    },

    onOpenChat: function(oEvent) {
       const oContext = oEvent.getSource().getBindingContext("miro");
       if (oContext) {
           this._openChatForItem(oContext.getObject());
       }
    },

    onPostComment: function(oEvent) {
       const text = oEvent.getParameter("value");
       if (!this._chatData) this._chatData = {};
       if (!this._chatData[this._currentChatInvoiceId]) this._chatData[this._currentChatInvoiceId] = [];
       const comments = this._chatData[this._currentChatInvoiceId];
       
       comments.push({
           sender: this._currentUser,
           icon: "sap-icon://employee",
           timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           text: text
       });
       
       if (text.includes("@")) {
           setTimeout(() => {
               comments.push({
                   sender: "Procurement Team",
                   icon: "sap-icon://customer",
                   timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                   text: "Acknowledged. We are cross-checking warehouse receipt GRN and PO line items."
               });
               if (this._chatDialog && this._chatDialog.getModel("chat")) {
                   this._chatDialog.getModel("chat").refresh(true);
               }
           }, 1000);
       }
       
       if (this._chatDialog && this._chatDialog.getModel("chat")) {
           this._chatDialog.getModel("chat").refresh(true);
       }
    }
  });
});
