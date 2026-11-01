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
      if (!user.username) return this.getOwnerComponent().getRouter().navTo("login");
      
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

    loadKpis: function () {
      const model = this.getView().getModel("miro");
      
      Promise.all([
        fetch("/api/v1/VendorDocLines").then(r => r.json()),
        fetch("/api/v1/MatchResults").then(r => r.json())
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
          
          let aiScore = 50;
          let aiSuggestion = "Review Manual";
          
          if (varianceRaw === 0 && r?.grNumber) {
             aiScore = 100;
             aiSuggestion = "Auto-Approve";
          } else if (code.includes("GR-PENDING") || (!r?.grNumber)) {
             aiScore = 85;
             aiSuggestion = "Park (Awaiting GR)";
          } else if (varianceRaw > 0 && varianceRaw <= 50) {
             aiScore = 90;
             aiSuggestion = "Approve (Tolerance)";
          } else if (varianceRaw > 50 && varianceRaw < 5000) {
             aiScore = 60;
             aiSuggestion = "Escalate to Buyer";
          } else if (varianceRaw >= 5000) {
             aiScore = 20;
             aiSuggestion = "Block & Dispute";
          }
          
          const itemData = {
            id: line.ID,
            invoiceNo: line.vendorInvoiceNo,
            vendor: line.sourceVendorCode,
            poNo: line.poReference || "N/A",
            grStatus: r?.grNumber ? "GR Posted" : "No GR",
            grState: r?.grNumber ? "Success" : "Error",
            amount: formattedAmt,
            variance: formattedDelta,
            varianceRaw: varianceRaw,
            blockReason: code.replace("UNMATCHED/", ""),
            status: line.paymentStatus || 'UNPAID',
            aiScore: aiScore,
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
      }).catch(err => {
        MessageToast.show("Failed to load workbench data");
        console.error(err);
      });
    },

    // Include Dhruv's new routing change from 1st-oct-dhruv
    onInvoicePress: function(oEvent) {
        let oCtx = oEvent.getSource().getBindingContext('miro');
        if (!oCtx) return;
        let obj = oCtx.getObject();
        let resultId = obj.id || obj.ID; 
        this.getOwnerComponent().getRouter().navTo("objectPage", { resultId: resultId });
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

    onOpenChat: function(oEvent) {
       const oContext = oEvent.getSource().getBindingContext("miro");
       const invoiceData = oContext.getObject();
       this._currentChatInvoiceId = invoiceData.id;
       
       if (!this._chatData[invoiceData.id]) {
           this._chatData[invoiceData.id] = [{
               sender: "Reconly AI",
               icon: "sap-icon://lightbulb",
               timestamp: new Date().toLocaleTimeString(),
               text: `AI Assessment: ${invoiceData.aiSuggestion}. Variance is ${invoiceData.variance}.`
           }];
       }

       const chatModel = new JSONModel({
           invoiceNo: invoiceData.invoiceNo,
           comments: this._chatData[invoiceData.id]
       });

       if (!this._chatDialog) {
           const oList = new List({
               items: {
                   path: "/comments",
                   template: new FeedListItem({
                       sender: "{sender}",
                       icon: "{icon}",
                       timestamp: "{timestamp}",
                       text: "{text}"
                   })
               }
           });
           
           const oFeedInput = new FeedInput({
               post: this.onPostComment.bind(this),
               placeholder: "Type @Buyer to mention Procurement..."
           });

           this._chatDialog = new Dialog({
               title: "Discussion: {/invoiceNo}",
               contentWidth: "400px",
               contentHeight: "450px",
               verticalScrolling: true,
               content: [ new VBox({ items: [oList, oFeedInput] }) ],
               beginButton: new Button({
                   text: "Close",
                   press: () => this._chatDialog.close()
               })
           });
           this.getView().addDependent(this._chatDialog);
       }

       this._chatDialog.setModel(chatModel);
       this._chatDialog.open();
    },

    onPostComment: function(oEvent) {
       const text = oEvent.getParameter("value");
       const comments = this._chatData[this._currentChatInvoiceId];
       
       comments.push({
           sender: this._currentUser,
           icon: "sap-icon://employee",
           timestamp: new Date().toLocaleTimeString(),
           text: text
       });
       
       if (text.includes("@")) {
           setTimeout(() => {
               comments.push({
                   sender: "Procurement Team",
                   icon: "sap-icon://customer",
                   timestamp: new Date().toLocaleTimeString(),
                   text: "We are looking into this variance. Please Park it for now."
               });
               this._chatDialog.getModel().refresh(true);
           }, 1500);
       }
       
       this._chatDialog.getModel().refresh(true);
    }
  });
});
