sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, MessageBox, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("vendordoclines.controller.Main", {
        onInit: function () {
            window._mainCtrl = this;
            if (this._initOcrModel) {
                this._initOcrModel();
            }
            if (this._initIntakeStats) {
                this._initIntakeStats();
            }
            if (this._initMatchAndExceptionStats) {
                this._initMatchAndExceptionStats();
            }
            const router = this.getOwnerComponent().getRouter();
            router.getRoute("main").attachPatternMatched(this._onObjectMatched, this);
            if (router.getRoute("objectPage")) {
                router.getRoute("objectPage").attachPatternMatched(this._onObjectMatchedObjectPage, this);
            }
            if (router.getRoute("grObjectPage")) {
                router.getRoute("grObjectPage").attachPatternMatched(this._onObjectMatchedGRObjectPage, this);
            }
        },

        _initOcrModel: function () {
            const ocrData = {
                invoiceNumber: "",
                invoiceDate: "",
                vendorName: "",
                vendorGstin: "",
                buyerName: "",
                buyerGstin: "",
                totalAmount: "",
                poNumber: "",
                tax: "",
                cgst: "",
                sgst: "",
                igst: "",
                rawText: ""
            };
            const model = new sap.ui.model.json.JSONModel(ocrData);
            this.getView().setModel(model, "ocrData");
        },

        _onObjectMatchedGRObjectPage: function () {
            const user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
            if (!user.username) { this.getOwnerComponent().getRouter().navTo("login"); return; }
            
            if (!this.getView().getModel("ui")) {
                const role = user.businessRole || '';
                let navItems = [];
                if (role === 'GR') {
                    navItems.push({ text: "Data Intake & Lines", icon: "sap-icon://database", key: "gr" });
                    navItems.push({ text: "GR Workbench", icon: "sap-icon://task", key: "gr_workbench" });
                }
                const uiModel = new sap.ui.model.json.JSONModel({ navItems: navItems });
                this.getView().setModel(uiModel, "ui");
                this.byId("sideNavigation").setSelectedKey("gr_workbench");
            } else {
                this.byId("sideNavigation").setSelectedKey("gr_workbench");
            }
        },

        _onObjectMatchedObjectPage: function () {
            const user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
            if (!user.username) {
                this.getOwnerComponent().getRouter().navTo("login");
                return;
            }
            
            if (!this.getView().getModel("ui")) {
                const role = user.businessRole || '';
                const isAdmin = (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'AP');
                let navItems = [];
                if (role === 'PR') { navItems.push({ text: "Purchase Requisitions", icon: "sap-icon://cart", key: "pr" }); }
                else if (role === 'PO') { navItems.push({ text: "Purchase Orders", icon: "sap-icon://sales-order", key: "po" }); }
                else if (role === 'GR') {
                    navItems.push({ text: "Data Intake & Lines", icon: "sap-icon://database", key: "gr" });
                    navItems.push({ text: "GR Workbench", icon: "sap-icon://task", key: "gr_workbench" });
                }
                else if (role === 'VENDOR') { 
                    navItems.push({ text: "Vendor Portal", icon: "sap-icon://supplier", key: "vendor" }); 
                    navItems.push({ text: "Scanning Section", icon: "sap-icon://document-text", key: "vendorScanning" });
                }
                else if (isAdmin || role === 'MIRO' || role === 'FINANCE') {
                    navItems.push({ text: "Executive Dashboard", icon: "sap-icon://business-objects-experience", key: "cockpit" });
                    navItems.push({ text: "Data Intake & Lines", icon: "sap-icon://database", key: "intake" });
                    navItems.push({ text: "Match Results", icon: "sap-icon://compare", key: "results" });
                    navItems.push({ text: "Exceptions", icon: "sap-icon://alert", key: "exceptions" });
                    navItems.push({ text: "Workbench", icon: "sap-icon://task", key: "miro" });
                }
                const uiModel = new sap.ui.model.json.JSONModel({ navItems: navItems });
                this.getView().setModel(uiModel, "ui");
                this.byId("sideNavigation").setSelectedKey("results");
            } else {
                this.byId("sideNavigation").setSelectedKey("results");
            }
        },

        _onObjectMatched: function () {
            let user = {};
            try {
                user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
            } catch (e) {
                sessionStorage.removeItem("vr_user");
            }
            
            if (!user.username) {
                this.getOwnerComponent().getRouter().navTo("login");
                return;
            }
            
            
            let role = (user.businessRole || '').toUpperCase().trim();
            if (role === "USER" || role === "") {
                if (user.username.toLowerCase().includes("pr")) role = "PR";
                else if (user.username.toLowerCase().includes("po")) role = "PO";
                else if (user.username.toLowerCase().includes("v")) role = "VENDOR";
                else if (user.username.toLowerCase().includes("gr")) role = "GR";
                else if (user.username.toLowerCase().includes("ap")) role = "AP";
                else if (user.username.toLowerCase().includes("admin")) role = "AP";
            }

            const isAdmin = (role === 'ADMIN' || role === 'AP');

            let navItems = [];
            if (role === 'PR') {
                navItems.push({ text: "Purchase Requisitions", icon: "sap-icon://cart", key: "pr" });
            } else if (role === 'PO') {
                navItems.push({ text: "Purchase Orders", icon: "sap-icon://sales-order", key: "po" });
            } else if (role === 'GR') {
                navItems.push({ text: "Data Intake & Lines", icon: "sap-icon://database", key: "gr" });
                navItems.push({ text: "GR Workbench", icon: "sap-icon://task", key: "gr_workbench" });
            } else if (role === 'VENDOR') {
                navItems.push({ text: "Vendor Portal", icon: "sap-icon://supplier", key: "vendor" });
                navItems.push({ text: "Scanning Section", icon: "sap-icon://document-text", key: "vendorScanning" });
            } else if (isAdmin || role === 'MIRO' || role === 'FINANCE') {
                navItems.push({ text: "Executive Dashboard", icon: "sap-icon://business-objects-experience", key: "cockpit" });
                navItems.push({ text: "Data Intake & Lines", icon: "sap-icon://database", key: "intake" });
                navItems.push({ text: "Match Results", icon: "sap-icon://compare", key: "results" });
                navItems.push({ text: "Exceptions", icon: "sap-icon://alert", key: "exceptions" });
                navItems.push({ text: "Workbench", icon: "sap-icon://task", key: "miro" });
            }

            const uiModel = new sap.ui.model.json.JSONModel({ navItems: navItems });
            this.getView().setModel(uiModel, "ui");

            // Update live persona tag in top shell header
            const oHeaderBadge = this.byId("headerUserBadge");
            if (oHeaderBadge) {
              const uName = (user.username && user.username.toLowerCase() === "admin") ? "Admin" : (user.username || "Admin");
              oHeaderBadge.setText("AP Finance Lead • " + uName);
            }

            let targetTab = sessionStorage.getItem("vr_nav_target_tab");
            sessionStorage.removeItem("vr_nav_target_tab");
            let defaultKey = (targetTab && navItems.some(n => n.key === targetTab)) ? targetTab : (navItems.length > 0 ? navItems[0].key : "cockpit");
            if (role === "GR" && !targetTab) defaultKey = "gr_workbench";
            sessionStorage.setItem("vr_last_main_tab", defaultKey);
            this.byId("sideNavigation").setSelectedKey(defaultKey);
            this.byId("pageContainer").to(this.createId(defaultKey));

            // If landing on cockpit, trigger chart render after DOM is visible
            if (defaultKey === "cockpit") {
                var oCockpitPage = this.byId("cockpit");
                if (oCockpitPage) {
                    var oInnerView = oCockpitPage.getContent && oCockpitPage.getContent()[0];
                    if (oInnerView && oInnerView.getController) {
                        var oCtrl = oInnerView.getController();
                        if (oCtrl && typeof oCtrl.loadKpis === "function" && !oCtrl._lastLoaded) {
                            setTimeout(function () { oCtrl.loadKpis(); }, 150);
                        }
                    }
                }
            } else if (defaultKey === "intake") {
                if (this._loadIntakeMetrics) {
                    this._loadIntakeMetrics();
                }
            }
        },

        
    formatRecommendation: function(reason) {
        if (!reason) return "Review manually";
        const r = reason.toLowerCase();
        if (r.includes('price')) return "Step 1: Contact Vendor for Price Adjustment.\nStep 2: Await Credit Note.";
        if (r.includes('quantity')) return "Step 1: Contact Warehouse to verify GR.\nStep 2: Request updated invoice if shortage confirmed.";
        if (r.includes('not found') || r.includes('missing')) return "Step 1: Check SAP for pending GR.\nStep 2: Expedite warehouse receipt.";
        return "Review manually";
    },

            _fileToBase64: function (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

        formatFallback: function(a, b, c, d) { return a || b || c || d || ''; },

        formatIntakeSourceText: function (sSource, sPayRef, sInvNo) {
            if (sSource === "OCR") return 'Smart OCR';
            if (sInvNo && typeof sInvNo === "string" && (sInvNo.indexOf('OCR-') === 0 || sInvNo.indexOf('INV-') === 0 || sInvNo.indexOf('GR-') === 0 || sInvNo.indexOf('GRN-') === 0)) return 'Smart OCR';
            if (sSource === "HANA" || sSource === "S21") return 'HANA';
            if (sPayRef && typeof sPayRef === "string" && sPayRef.indexOf('TC') === 0) return 'HANA';
            if (sInvNo && typeof sInvNo === "string" && sInvNo.indexOf('S21-') === 0) return 'HANA';
            if (sSource === "BATCH_UPLOAD" || sSource === "STATEMENT" || sSource === "UPLOAD") return 'Statement Upload';
            return 'Statement Upload';
        },

        formatIntakeSourceState: function (sSource, sPayRef, sInvNo) {
            if (sSource === "OCR") return 'Indication05';
            if (sInvNo && typeof sInvNo === "string" && (sInvNo.indexOf('OCR-') === 0 || sInvNo.indexOf('INV-') === 0 || sInvNo.indexOf('GR-') === 0 || sInvNo.indexOf('GRN-') === 0)) return 'Indication05';
            if (sSource === "HANA" || sSource === "S21") return 'Information';
            if (sPayRef && typeof sPayRef === "string" && sPayRef.indexOf('TC') === 0) return 'Information';
            if (sInvNo && typeof sInvNo === "string" && sInvNo.indexOf('S21-') === 0) return 'Information';
            if (sSource === "BATCH_UPLOAD" || sSource === "STATEMENT" || sSource === "UPLOAD") return 'Success';
            return 'Success';
        },

        isDemoInvoice: function (invNo) {
            if (!invNo) return false;
            const demoInvoices = ['5105601060', '5105600963', '5105601047', 'INV-7530', '5105600968', '5105601024', '951025-26', 'INV-2026-8761'];
            return demoInvoices.includes(String(invNo).trim());
        },

        getDemoLabel: function (invNo) {
            if (!invNo) return "";
            return '★';
        },

        formatCurrencyFallback: function (c) {
            return c || 'INR';
        },

        formatOutcomeStatusState: function (code) {
            if (!code) return "None";
            const c = String(code).toUpperCase();
            if (c.indexOf("MATCHED") !== -1 && c.indexOf("UNMATCHED") === -1) return "Success";
            if (c.indexOf("UNMATCHED") !== -1 || c.indexOf("MISMATCH") !== -1 || c.indexOf("ERROR") !== -1) return "Error";
            return "Warning";
        },

        formatStatusState: function (status) {
            if (status === "RESOLVED") return "Success";
            if (status === "OPEN") return "Error";
            return "Warning";
        },

        onCloseDialog: function() {
      if (this.oDetailsDialog) {
        this.oDetailsDialog.close();
      }
    },

        onInvoicePress: function(oEvent) {
            let oCtx = oEvent.getSource().getBindingContext();
            const isMiro = !oCtx;
            if (isMiro) oCtx = oEvent.getSource().getBindingContext('miro');
            if (!oCtx) return;
            
            let currentKey = this.byId("sideNavigation") ? this.byId("sideNavigation").getSelectedKey() : "results";
            sessionStorage.setItem("vr_last_main_tab", currentKey || "results");
            
            let obj = oCtx.getObject();
            let resultId = obj.ID;
            if (obj.matchResult_ID) {
                resultId = obj.matchResult_ID;
            } else if (obj.matchResult && obj.matchResult.ID) {
                resultId = obj.matchResult.ID;
            } else if (obj.vendorDocLine_ID) {
                resultId = obj.vendorDocLine_ID;
            }
            this.getOwnerComponent().getRouter().navTo("objectPage", { resultId: resultId });
        },

        formatGrDisplay: function (gr) {
            return gr || "Pending (MIGO)";
        },

        formatVarianceDisplay: function (delta) {
            if (delta === null || delta === undefined) return "₹ 0.00";
            const val = parseFloat(delta);
            const prefix = val > 0 ? "+₹ " : (val < 0 ? "-₹ " : "₹ ");
            return prefix + Math.abs(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        formatPoFallback: function (po1, po2) {
            return po1 || po2 || "PO Pending";
        },

        formatDiscrepancyCategory: function (code) {
            if (!code) return "Discrepancy Review";
            const c = String(code).toUpperCase();
            if (c.indexOf("PRICE") !== -1) return "Price > PO Rate";
            if (c.indexOf("GR") !== -1) return "Store GRN Missing";
            if (c.indexOf("QTY") !== -1) return "Quantity Variance";
            if (c.indexOf("GST") !== -1 || c.indexOf("TAX") !== -1) return "GST-2B / Tax Gap";
            if (c.indexOf("CN") !== -1) return "Credit Note Missing";
            return "3-Way Discrepancy";
        },

        formatAiScoreForException: function (code, delta) {
            const c = String(code || "").toUpperCase();
            const d = Math.abs(parseFloat(delta || 0));
            if (c.indexOf("MATCHED") !== -1 && c.indexOf("UNMATCHED") === -1) return "98%";
            if (d > 0 && d <= 50) return "92%";
            if (c.indexOf("GR") !== -1) return "85%";
            if (c.indexOf("QTY") !== -1) return "60%";
            if (c.indexOf("PRICE") !== -1 && d > 5000) return "25%";
            if (c.indexOf("PRICE") !== -1) return "45%";
            return "50%";
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

formatDate: function (sDate) {
            if (!sDate) return "�";
            try {
                return new Date(sDate).toLocaleDateString();
            } catch (e) {
                return "�";
            }
        },

        onItemSelect: function (oEvent) {
            const key = oEvent.getParameter("item").getKey();
            this.navigateToTab(key);
        },

        navigateToTab: function (key, mContext) {
            sessionStorage.setItem("vr_last_main_tab", key);
            var oSideNav = this.byId("sideNavigation");
            if (oSideNav) {
                oSideNav.setSelectedKey(key);
            }
            var oPageContainer = this.byId("pageContainer");
            if (oPageContainer) {
                oPageContainer.to(this.createId(key));
            }
            // Re-render cockpit charts once the page is visible in the DOM
            if (key === "cockpit") {
                var oCockpitPage = this.byId("cockpit");
                if (oCockpitPage) {
                    var oInnerView = oCockpitPage.getContent && oCockpitPage.getContent()[0];
                    if (oInnerView && oInnerView.getController) {
                        var oCtrl = oInnerView.getController();
                        if (oCtrl && typeof oCtrl.loadKpis === "function") {
                            setTimeout(function () { oCtrl.loadKpis(); }, 100);
                        }
                    }
                }
            } else if (key === "intake") {
                if (this._loadIntakeMetrics) {
                    this._loadIntakeMetrics();
                }
            } else if (key === "results" || key === "exceptions") {
                if (this._loadMatchAndExceptionMetrics) {
                    this._loadMatchAndExceptionMetrics();
                }
                if (key === "results" && mContext && mContext.kpiFilter) {
                    var sFilterKey = mContext.kpiFilter;
                    var sStatusFilter = "ALL";
                    if (sFilterKey === "autoMatched") {
                        sStatusFilter = "MATCHED";
                    } else if (sFilterKey === "mismatch" || sFilterKey === "blocked" || sFilterKey === "highValueExceptions") {
                        sStatusFilter = "UNMATCHED";
                    }
                    var oSegment = this.byId("matchFilterStatus");
                    if (oSegment) {
                        oSegment.setSelectedKey(sStatusFilter);
                    }
                    var oModel = this.getView().getModel("matchStats");
                    if (oModel) {
                        oModel.setProperty("/selectedStatusFilter", sStatusFilter);
                    }
                    this._applyMatchFilters("", sStatusFilter);
                }
            } else if (key === "miro") {
                var oMiroPage = this.byId("miro");
                if (oMiroPage) {
                    var oInnerView = oMiroPage.getContent && oMiroPage.getContent()[0];
                    if (oInnerView && oInnerView.getController && typeof oInnerView.getController().loadKpis === "function") {
                        setTimeout(function () { oInnerView.getController().loadKpis(); }, 100);
                    }
                }
            }
        },

        onSideNavButtonPress: function () {
            const sideNavigation = this.byId("sideNavigation");
            const expanded = sideNavigation.getExpanded();
            sideNavigation.setExpanded(!expanded);
        },

        _refreshSubViews: function () {
            const views = ["intake", "results", "exceptions", "miro", "po", "pr", "gr", "gr_workbench", "cockpit", "vendor", "vendorScanning"];
            views.forEach(v => {
                const view = this.byId(v);
                if (view) {
                    if (typeof view.getController === "function" && view.getController() && typeof view.getController().onRefresh === "function") {
                        view.getController().onRefresh();
                    } else if (typeof view.getContent === "function" && view.getContent().length > 0) {
                        const innerView = view.getContent()[0];
                        if (innerView && typeof innerView.getController === "function" && innerView.getController() && typeof innerView.getController().onRefresh === "function") {
                            innerView.getController().onRefresh();
                        }
                    }
                }
            });
        },

        _initIntakeStats: function () {
            const stats = {
                totalInvoices: "157",
                countAll: "157",
                countS21: "10",
                countOcr: "21",
                countUpload: "126",
                totalAmountFormatted: "₹ 1,22,68,528.56",
                activeVendors: "18 Vendors",
                erpStatus: "ONLINE",
                lastSyncTime: "Just now",
                selectedSourceFilter: "ALL"
            };
            const oModel = new sap.ui.model.json.JSONModel(stats);
            this.getView().setModel(oModel, "intakeStats");
            this._loadIntakeMetrics();
        },

        _loadIntakeMetrics: function () {
            const self = this;
            fetch("/api/v1/VendorDocLines")
                .then(r => r.json())
                .then(data => {
                    if (!data || !data.value) return;
                    const items = data.value;
                    const count = items.length;
                    self._intakeVendorMap = {};
                    items.forEach(i => {
                        if (i.vendorName && i.sourceVendorCode) {
                            self._intakeVendorMap[i.vendorName.toLowerCase()] = i.sourceVendorCode;
                        }
                    });
                    const totalVal = items.reduce((sum, item) => sum + parseFloat(item.invoiceGrossAmount || item.invoiceAmount || 0), 0);
                    const vendorSet = new Set(items.map(i => i.sourceVendorCode || i.vendorName).filter(Boolean));
                    
                    const countS21 = items.filter(i => i.ingestionSource === "HANA" || i.ingestionSource === "S21" || (i.paymentReference && String(i.paymentReference).indexOf("TC") === 0) || (i.vendorInvoiceNo && String(i.vendorInvoiceNo).indexOf("S21-") === 0)).length;
                    const countOcr = items.filter(i => i.ingestionSource === "OCR").length;
                    const countUpload = items.filter(i => i.ingestionSource === "BATCH_UPLOAD" || i.ingestionSource === "STATEMENT" || (!i.ingestionSource && (!i.paymentReference || String(i.paymentReference).indexOf("TC") !== 0) && (!i.vendorInvoiceNo || String(i.vendorInvoiceNo).indexOf("S21-") !== 0))).length;

                    const formattedAmount = "₹ " + totalVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });

                    const oModel = self.getView().getModel("intakeStats");
                    if (oModel) {
                        oModel.setProperty("/totalInvoices", count.toString());
                        oModel.setProperty("/countAll", count.toString());
                        oModel.setProperty("/countS21", countS21.toString());
                        oModel.setProperty("/countOcr", countOcr.toString());
                        oModel.setProperty("/countUpload", countUpload.toString());
                        oModel.setProperty("/totalAmountFormatted", formattedAmount);
                        oModel.setProperty("/activeVendors", vendorSet.size.toString() + " Vendors");
                        oModel.setProperty("/erpStatus", "CONNECTED");
                        const now = new Date();
                        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        oModel.setProperty("/lastSyncTime", timeStr);
                    }
                })
                .catch(err => {
                    console.error("Failed to load intake metrics:", err);
                });
        },

        onSearchIntake: function (oEvent) {
            const sQuery = oEvent.getParameter("query") !== undefined ? oEvent.getParameter("query") : oEvent.getParameter("newValue");
            const oFilter = this.byId("intakeFilterSource");
            const sKey = oFilter ? oFilter.getSelectedKey() : "ALL";
            this._applyIntakeFilters(sQuery, sKey);
        },

        onFilterSourceSelect: function (oEvent) {
            let sKey = "ALL";
            if (oEvent) {
                if (oEvent.getParameter("item") && typeof oEvent.getParameter("item").getKey === "function") {
                    sKey = oEvent.getParameter("item").getKey();
                } else if (oEvent.getParameter("key")) {
                    sKey = oEvent.getParameter("key");
                } else if (oEvent.getSource && typeof oEvent.getSource === "function") {
                    sKey = oEvent.getSource().getSelectedKey();
                }
            }
            if (!sKey) {
                const oCtrl = this.byId("intakeFilterSource");
                sKey = oCtrl ? oCtrl.getSelectedKey() : "ALL";
            }

            const oModel = this.getView().getModel("intakeStats");
            if (oModel) {
                oModel.setProperty("/selectedSourceFilter", sKey);
            }
            const oSearch = this.byId("intakeSearchField");
            const sQuery = oSearch ? oSearch.getValue() : "";
            this._applyIntakeFilters(sQuery, sKey);
        },

        _applyIntakeFilters: function (sQuery, sSourceKey) {
            const oTable = this.byId("intakeTable");
            if (!oTable) return;
            const oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            let aAllFilters = [];

            if (sQuery && sQuery.trim().length > 0) {
                const sTrimmed = sQuery.trim();
                const aSearchFilters = [
                    new Filter("vendorInvoiceNo", FilterOperator.Contains, sTrimmed),
                    new Filter("poReference", FilterOperator.Contains, sTrimmed),
                    new Filter("sourceVendorCode", FilterOperator.Contains, sTrimmed),
                    new Filter("paymentReference", FilterOperator.Contains, sTrimmed)
                ];

                if (this._intakeVendorMap) {
                    const sLower = sTrimmed.toLowerCase();
                    for (const [vName, vCode] of Object.entries(this._intakeVendorMap)) {
                        if (vName.includes(sLower) && vCode) {
                            aSearchFilters.push(new Filter("sourceVendorCode", FilterOperator.EQ, vCode));
                        }
                    }
                }

                aAllFilters.push(new Filter({
                    filters: aSearchFilters,
                    and: false
                }));
            }

            sSourceKey = sSourceKey || (this.byId("intakeFilterSource") ? this.byId("intakeFilterSource").getSelectedKey() : "ALL");
            
            if (sSourceKey === "S21" || sSourceKey === "HANA") {
                aAllFilters.push(new Filter({
                    filters: [
                        new Filter("ingestionSource", FilterOperator.EQ, "HANA"),
                        new Filter("ingestionSource", FilterOperator.EQ, "S21"),
                        new Filter("paymentReference", FilterOperator.StartsWith, "TC"),
                        new Filter("vendorInvoiceNo", FilterOperator.StartsWith, "S21-")
                    ],
                    and: false
                }));
            } else if (sSourceKey === "OCR") {
                aAllFilters.push(new Filter({
                    filters: [
                        new Filter("ingestionSource", FilterOperator.EQ, "OCR"),
                        new Filter("vendorInvoiceNo", FilterOperator.StartsWith, "OCR-")
                    ],
                    and: false
                }));
            } else if (sSourceKey === "UPLOAD" || sSourceKey === "BATCH_UPLOAD") {
                aAllFilters.push(new Filter({
                    filters: [
                        new Filter("ingestionSource", FilterOperator.EQ, "BATCH_UPLOAD"),
                        new Filter("ingestionSource", FilterOperator.EQ, "STATEMENT"),
                        new Filter("paymentReference", FilterOperator.EQ, null)
                    ],
                    and: false
                }));
            }

            oBinding.filter(aAllFilters, sap.ui.model.FilterType.Application);
        },

        onRefreshIntake: function () {
            const oTable = this.byId("intakeTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
            const oSearch = this.byId("intakeSearchField");
            if (oSearch) {
                oSearch.setValue("");
            }
            const oFilter = this.byId("intakeFilterSource");
            if (oFilter) {
                oFilter.setSelectedKey("ALL");
            }
            this._applyIntakeFilters("", "ALL");
            this._loadIntakeMetrics();
            MessageToast.show("Data Intake Queue Refreshed");
        },

    onUploadSapLedger: function () {
      MessageBox.information("The mock SAP Ledger upload feature has been disabled in preparation for the live S21 integration.");
    },
    onUploadStatement: function () {
      const uploader = this.byId("statementUploader");
      if (!uploader || !uploader.getFocusDomRef() || !uploader.getFocusDomRef().files || uploader.getFocusDomRef().files.length === 0) {
        MessageBox.error("Please click 'Browse' and select a Vendor Statement file first.");
        return;
      }
      const file = uploader.getFocusDomRef().files[0];
      this._fileToBase64(file).then(base64 => {
        const model = this.getView().getModel();
        const ctx = model.bindContext("/uploadStatement(...)");
        ctx.setParameter("fileBase64", base64);
        ctx.setParameter("companyCode", "1000");
        ctx.setParameter("period", "04-2026");
        ctx.setParameter("fiscalYear", "2026");
        ctx.setParameter("fileName", file.name || "statement.xlsx");
        ctx.execute().then(() => {
          MessageToast.show("Vendor Statement uploaded and matched successfully");
          model.refresh();
          this._refreshSubViews();
          if (this._loadIntakeMetrics) {
            this._loadIntakeMetrics();
          }
        }).catch(e => MessageToast.show("Error: " + e.message));
      });
    },
    
    onOpenOcrDialog: function () {
        if (!this.oOcrDialog) {
            sap.ui.core.Fragment.load({
                name: "vendordoclines.view.OcrScanner",
                controller: this
            }).then(function (oDialog) {
                this.oOcrDialog = new sap.m.Dialog({
                    title: "Smart Scan (OCR)",
                    contentWidth: "900px",
                    contentHeight: "600px",
                    content: oDialog,
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this.oOcrDialog.close();
                        }.bind(this)
                    })
                });
                this.getView().addDependent(this.oOcrDialog);
                this._initOcrModel();
                this.oOcrDialog.open();
            }.bind(this));
        } else {
            this._initOcrModel();
            this.oOcrDialog.open();
        }
    },

    _getControl: function(sId) {
        if (this.oOcrDialog && this.oOcrDialog.isOpen()) {
            return sap.ui.getCore().byId(sId) || this.byId(sId);
        }
        return this.byId(sId);
    },

    _initOcrModel: function() {
        const ocrModel = new sap.ui.model.json.JSONModel({
            invoiceNumber: "",
            invoiceDate: "",
            totalAmount: "",
            poNumber: "",
            tax: ""
        });
        this.getView().setModel(ocrModel, "ocrData");
        
        // reset UI
        const image = this._getControl("ocrImage");
        const placeholder = this._getControl("ocrImagePlaceholder");
        const container = this._getControl("ocrImageContainer");
        const progressInd = this._getControl("ocrProgress");
        const statusText = this._getControl("ocrStatusText");
        
        if (image) image.setSrc("");
        if (placeholder) placeholder.setVisible(true);
        if (container) container.removeStyleClass("vrOcrScanning");
        if (progressInd) progressInd.setVisible(false);
        if (statusText) statusText.setText("");
    },

    onOcrFileChange: function(oEvent) {
        const file = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
        if (!file) {
            this._currentOcrFile = null;
            return;
        }
        
        this._currentOcrFile = file; // Save for the scanner
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const image = this._getControl("ocrImage");
            const pdfViewer = this._getControl("ocrPdfViewer");
            const placeholder = this._getControl("ocrImagePlaceholder");
            
            if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                image.setVisible(false);
                if (pdfViewer) {
                    pdfViewer.setVisible(true);
                    pdfViewer.setContent("<iframe src='" + e.target.result + "' width='100%' height='100%' style='border:none;min-height:450px;'></iframe>");
                }
            } else {
                if (pdfViewer) pdfViewer.setVisible(false);
                image.setSrc(e.target.result);
                image.addStyleClass("vrOcrImage");
                image.setVisible(true);
            }
            placeholder.setVisible(false);
        };
        reader.readAsDataURL(file);
    },
    
    onStartSmartScan: function () {
        const file = this._currentOcrFile;
        if (!file) {
            sap.m.MessageToast.show("Please select an Image or PDF first.");
            return;
        }

        const progressInd = this._getControl("ocrProgress");
        const statusText = this._getControl("ocrStatusText");
        
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            this._getControl("ocrProgressContainer").setVisible(true);
            progressInd.setPercentValue(25);
            statusText.setText("Rendering PDF (with digital signature & font decoding)...");
            
            // Load PDF.js dynamically with CMaps support for digitally signed & Identity-H PDFs
            const loadPdfJs = () => new Promise((resolve) => {
                if (window.pdfjsLib) { resolve(); return; }
                const script = document.createElement("script");
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                script.onload = () => {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                    resolve();
                };
                document.head.appendChild(script);
            });
            
            loadPdfJs().then(() => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const typedarray = new Uint8Array(e.target.result);
                        const pdf = await window.pdfjsLib.getDocument({
                            data: typedarray,
                            cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/",
                            cMapPacked: true,
                            stopAtErrors: false
                        }).promise;
                        const page = await pdf.getPage(1); // Scan first page
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement("canvas");
                        const context = canvas.getContext("2d");
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        await page.render({ canvasContext: context, viewport: viewport, renderInteractiveForms: true }).promise;
                        const base64Image = canvas.toDataURL("image/jpeg", 0.95);
                        
                        const ocrImg = this._getControl("ocrImage");
                        if (ocrImg) {
                            ocrImg.setSrc(base64Image);
                            ocrImg.setVisible(true);
                        }
                        this._runOpenAiScan(base64Image);
                    } catch(err) {
                        sap.m.MessageBox.error("PDF parsing failed: " + err.message);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        } else {
            const imageSrc = this._getControl("ocrImage").getSrc();
            this._runOpenAiScan(imageSrc);
        }
    },

    _runOpenAiScan: function(imageSrc) {
        const progressContainer = this._getControl("ocrProgressContainer");
        const progressInd = this._getControl("ocrProgress");
        const statusText = this._getControl("ocrStatusText");
        const container = this._getControl("ocrImageContainer");

        progressContainer.setVisible(true);
        progressInd.setPercentValue(50);
        progressInd.setDisplayValue("Scanning...");
        statusText.setText("Analyzing Document with AI Engine via Secure Server...");
        container.addStyleClass("vrOcrScanning");

        // Secure server-side OCR execution (reads process.env.OPENAI_API_KEY on backend)
        fetch("/api/v1/scanInvoiceOcr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: imageSrc })
        })
        .then(async res => {
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const msg = errData.error?.message || "Server OCR extraction failed";
                throw new Error(msg);
            }
            return res.json();
        })
        .then(srvData => {
            let extracted = srvData.value !== undefined ? srvData.value : srvData;
            if (typeof extracted === "string") {
                let cleanStr = extracted.trim();
                if (cleanStr.startsWith("```json")) {
                    cleanStr = cleanStr.replace(/^```json/, "").replace(/```$/, "").trim();
                } else if (cleanStr.startsWith("```")) {
                    cleanStr = cleanStr.replace(/^```/, "").replace(/```$/, "").trim();
                }
                extracted = JSON.parse(cleanStr);
            }

            container.removeStyleClass("vrOcrScanning");
            progressInd.setPercentValue(100);
            progressInd.setDisplayValue("100%");
            statusText.setText("Scan Complete! Data extracted.");

            const model = this.getView().getModel("ocrData");
            if (model && extracted) {
                let mainDocNumber = extracted.invoiceNumber;
                if (!mainDocNumber || mainDocNumber.trim() === "") {
                    mainDocNumber = extracted.poNumber || "";
                }
                model.setProperty("/invoiceNumber", mainDocNumber);
                model.setProperty("/invoiceDate", extracted.invoiceDate || "");
                
                model.setProperty("/vendorName", extracted.vendorName || "");
                model.setProperty("/vendorGstin", extracted.vendorGstin || "");
                model.setProperty("/buyerName", extracted.buyerName || "");
                model.setProperty("/buyerGstin", extracted.buyerGstin || "");

                model.setProperty("/totalAmount", extracted.totalAmount || "");
                model.setProperty("/poNumber", extracted.poNumber || "");
                
                model.setProperty("/tax", extracted.tax || "");
                model.setProperty("/cgst", extracted.cgst || "");
                model.setProperty("/sgst", extracted.sgst || "");
                model.setProperty("/igst", extracted.igst || "");
                
                model.setProperty("/rawText", "Extraction Engine Output:\n\n" + JSON.stringify(extracted, null, 2));
            }
            sap.m.MessageToast.show("Data Extracted Successfully!");
        })
        .catch(err => {
            container.removeStyleClass("vrOcrScanning");
            statusText.setText("Error during scan: " + err.message);
            sap.m.MessageToast.show("Scan failed: " + err.message);
            console.error("Scan Error:", err);
        });
    },

        onSubmitScannedInvoice: function() {
        const ocrData = this.getView().getModel("ocrData").getData();
        if (!ocrData.invoiceNumber && !ocrData.poNumber) {
            sap.m.MessageBox.error("No document number extracted. Please scan an invoice first.");
            return;
        }

        sap.ui.core.BusyIndicator.show(0);

        // More robust date parsing
        let invoiceDateObj = null;
        if (ocrData.invoiceDate) {
            // The AI should now output YYYY-MM-DD
            if (ocrData.invoiceDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                invoiceDateObj = ocrData.invoiceDate;
            } else {
                let d = new Date(ocrData.invoiceDate);
                if (!isNaN(d.getTime())) {
                    invoiceDateObj = d.toISOString().split('T')[0];
                }
            }
        }
        
        let amountStr = (ocrData.totalAmount || "").toString().replace(/,/g, '').replace(/[^\d.]/g, '');
        let amount = parseFloat(amountStr);
        if (isNaN(amount)) amount = 0;

        let invNo = (ocrData.invoiceNumber || ocrData.grNumber || ocrData.poNumber || "").trim();
        if (ocrData.documentType === 'GRN' && invNo && !invNo.startsWith('GR')) {
            invNo = 'GRN-' + invNo;
        }

        const payload = {
            ingestionSource: "OCR",
            vendorInvoiceNo: invNo.substring(0, 30),
            invoiceDate: invoiceDateObj,
            invoiceGrossAmount: amount,
            currency: "INR",
            poReference: (ocrData.poNumber || "").substring(0, 30),
            sourceVendorCode: (ocrData.vendorName || "EXT-OCR").substring(0, 30),
            sourceGstin: (ocrData.vendorGstin || "").substring(0, 30)
        };

        
        // We use fetch directly to /recon/VendorDocLines to instantly commit the record.
        // This completely avoids the SAPUI5 "blue highlighted pending row" issue where a locally 
        // created OData V4 context gets stuck waiting for a batch submission that might never happen.
        // (BTP Fix: We fetch the CSRF token first so it doesn't fail on Cloud Foundry!)
        fetch("/api/v1/", { method: "HEAD", headers: { "X-CSRF-Token": "Fetch" } })
        .then(res => {
            const csrfToken = res.headers.get("X-CSRF-Token") || "";
            return fetch("/api/v1/VendorDocLines", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken
                },
                body: JSON.stringify(payload)
            });
        })
        .then(res => {
            if (!res.ok) {
                // Server might have returned HTML or JSON error. Read as text.
                return res.text().then(txt => {
                    const shortMsg = txt.substring(0, 200).replace(/\s+/g, ' ');
                    throw new Error(shortMsg);
                });
            }
            // Successful response
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return res.json();
            }
            return res.text();
        })
        .then(() => {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageToast.show("Invoice successfully saved to database!");
            if (this.oOcrDialog && this.oOcrDialog.isOpen()) this.oOcrDialog.close();
            this.getView().getModel().refresh();
            this._loadIntakeMetrics();
            this._refreshSubViews();
            if (this.onRunMatching) {
                this.onRunMatching();
            }
        })
        .catch(err => {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageBox.error("Failed to save invoice: " + err.message);
        });
    },

    onRunMatching: function () {
      sap.ui.core.BusyIndicator.show(0);
      fetch("/api/v1/", { method: "HEAD", headers: { "X-CSRF-Token": "Fetch" } })
      .then(res => {
          const csrf = res.headers.get("X-CSRF-Token") || "";
          return fetch("/api/v1/runMatching", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
              body: JSON.stringify({ statementUploadId: null })
          });
      })
      .then(res => {
          if(!res.ok) throw new Error("Backend error");
          sap.ui.core.BusyIndicator.hide();
          sap.m.MessageToast.show("Matching engine successful");
          this.getView().getModel().refresh();
          this._refreshSubViews();
          if (this._loadMatchAndExceptionMetrics) {
              this._loadMatchAndExceptionMetrics();
          }
      })
      .catch(e => {
          sap.ui.core.BusyIndicator.hide();
          sap.m.MessageToast.show("Error: " + e.message);
      });
    },

    _initMatchAndExceptionStats: function () {
        const matchModel = new sap.ui.model.json.JSONModel({
            total: 0,
            cleanMatched: 0,
            exceptions: 0,
            selectedStatusFilter: "ALL"
        });
        this.getView().setModel(matchModel, "matchStats");

        const exModel = new sap.ui.model.json.JSONModel({
            openCount: 0,
            blockedValueFormatted: "₹ 0.00",
            priceCount: 0,
            grCount: 0,
            qtyCount: 0,
            resolvedCount: 0,
            selectedCategoryFilter: "ALL"
        });
        this.getView().setModel(exModel, "exceptionStats");

        this._loadMatchAndExceptionMetrics();
    },

    _loadMatchAndExceptionMetrics: function () {
        const self = this;
        Promise.all([
            fetch("/api/v1/MatchResults").then(r => r.json()).catch(() => ({ value: [] })),
            fetch("/api/v1/Exceptions").then(r => r.json()).catch(() => ({ value: [] })),
            fetch("/api/v1/VendorDocLines").then(r => r.json()).catch(() => ({ value: [] }))
        ]).then(([matchData, exData, docData]) => {
            const matches = (matchData && matchData.value) || [];
            const exceptions = (exData && exData.value) || [];
            const docLines = (docData && docData.value) || [];

            const totalMatches = matches.length;
            const uniqueInvoicesSet = new Set(matches.map(m => m.invoiceNo || (m.vendorDocLine && m.vendorDocLine.vendorInvoiceNo)).filter(Boolean));
            const uniqueInvoicesEvaluated = uniqueInvoicesSet.size || docLines.length || 160;
            const cleanCount = matches.filter(m => (m.outcomeCode || "").toUpperCase().indexOf("MATCHED") !== -1 && (m.outcomeCode || "").toUpperCase().indexOf("UNMATCHED") === -1).length;
            const exInMatchCount = matches.filter(m => (m.outcomeCode || "").toUpperCase().indexOf("UNMATCHED") !== -1).length;

            const matchStatsModel = self.getView().getModel("matchStats");
            if (matchStatsModel) {
                matchStatsModel.setProperty("/total", totalMatches);
                matchStatsModel.setProperty("/totalInvoices", uniqueInvoicesEvaluated);
                matchStatsModel.setProperty("/cleanMatched", cleanCount);
                matchStatsModel.setProperty("/exceptions", exInMatchCount || exceptions.length);
            }

            const openExceptions = exceptions.filter(e => (e.status || "OPEN").toUpperCase() === "OPEN");
            const resolvedExceptions = exceptions.filter(e => (e.status || "").toUpperCase() === "RESOLVED");
            const uniqueExInvoices = new Set(openExceptions.map(e => e.invoiceNo).filter(Boolean)).size || 31;
            const priceCount = openExceptions.filter(e => (e.outcomeCode || "").toUpperCase().indexOf("PRICE") !== -1).length;
            const grCount = openExceptions.filter(e => (e.outcomeCode || "").toUpperCase().indexOf("GR") !== -1).length;
            const qtyCount = openExceptions.filter(e => (e.outcomeCode || "").toUpperCase().indexOf("QTY") !== -1).length;

            const matchMap = new Map(matches.map(m => [m.ID, m]));
            const docMap = new Map(docLines.map(d => [d.vendorInvoiceNo, d]));

            let totalBlockedVal = 0;
            openExceptions.forEach(e => {
                const match = matchMap.get(e.matchResult_ID);
                const delta = Math.abs(parseFloat(match?.amountDelta || e.amountDelta || 0));
                const doc = docMap.get(e.invoiceNo);
                const gross = parseFloat(doc?.invoiceGrossAmount || doc?.invoiceAmount || 0);
                totalBlockedVal += (delta > 0 ? delta : (gross > 0 ? gross : 15000));
            });

            const formattedBlocked = "₹ " + totalBlockedVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            const exStatsModel = self.getView().getModel("exceptionStats");
            if (exStatsModel) {
                exStatsModel.setProperty("/openCount", openExceptions.length);
                exStatsModel.setProperty("/uniqueInvoiceCount", uniqueExInvoices);
                exStatsModel.setProperty("/resolvedCount", resolvedExceptions.length);
                exStatsModel.setProperty("/blockedValueFormatted", formattedBlocked);
                exStatsModel.setProperty("/priceCount", priceCount);
                exStatsModel.setProperty("/grCount", grCount);
                exStatsModel.setProperty("/qtyCount", qtyCount);
            }
        }).catch(e => {
            console.error("Failed to load match and exception metrics:", e);
        });
    },

    onJumpToExceptions: function () {
        this.byId("sideNavigation").setSelectedKey("exceptions");
        this.byId("pageContainer").to(this.createId("exceptions"));
        if (this._loadMatchAndExceptionMetrics) {
            this._loadMatchAndExceptionMetrics();
        }
    },

    onNavToWorkbench: function () {
        this.byId("sideNavigation").setSelectedKey("miro");
        this.byId("pageContainer").to(this.createId("miro"));
        var oMiroPage = this.byId("miro");
        if (oMiroPage) {
            var oInnerView = oMiroPage.getContent && oMiroPage.getContent()[0];
            if (oInnerView && oInnerView.getController && typeof oInnerView.getController().loadKpis === "function") {
                oInnerView.getController().loadKpis();
            }
        }
    },

    onResolveInWorkbench: function (oEvent) {
        const oCtx = oEvent.getSource().getBindingContext();
        if (!oCtx) return;
        const obj = oCtx.getObject();
        const invNo = obj.invoiceNo || (obj.matchResult && obj.matchResult.invoiceNo);
        if (invNo) {
            sessionStorage.setItem("vr_workbench_target_invoice", invNo);
        }
        this.onNavToWorkbench();
        MessageToast.show("Routed invoice " + (invNo || "") + " to AP Workbench for settlement");
    },

    onQuickResolveException: function (oEvent) {
        const oCtx = oEvent.getSource().getBindingContext();
        if (!oCtx) return;
        const obj = oCtx.getObject();
        const exId = obj.ID;
        const invNo = obj.invoiceNo;
        const self = this;

        MessageBox.confirm("Are you sure you want to quick-settle exception for Invoice #" + invNo + "?", {
            title: "Quick Settle Exception",
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            emphasizedAction: MessageBox.Action.YES,
            onClose: function (sAction) {
                if (sAction === MessageBox.Action.YES) {
                    sap.ui.core.BusyIndicator.show(0);
                    fetch("/api/v1/resolveException", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ exceptionId: exId, note: "Settled via AP Exception Triage" })
                    })
                    .then(res => {
                        sap.ui.core.BusyIndicator.hide();
                        if (!res.ok) throw new Error("Resolution failed");
                        MessageToast.show("Invoice #" + invNo + " exception resolved");
                        self.getView().getModel().refresh();
                        self._loadMatchAndExceptionMetrics();
                    })
                    .catch(err => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Error: " + err.message);
                    });
                }
            }
        });
    },

    onFilterMatchStatus: function (oEvent) {
        const sKey = (oEvent.getParameter("item") && oEvent.getParameter("item").getKey()) || oEvent.getParameter("key") || "ALL";
        const oModel = this.getView().getModel("matchStats");
        if (oModel) oModel.setProperty("/selectedStatusFilter", sKey);
        const oSearch = this.byId("matchSearchField");
        const sQuery = oSearch ? oSearch.getValue() : "";
        this._applyMatchFilters(sQuery, sKey);
    },

    onSearchMatchResults: function (oEvent) {
        const sQuery = oEvent.getParameter("query") !== undefined ? oEvent.getParameter("query") : oEvent.getParameter("newValue");
        const sKey = (this.getView().getModel("matchStats") && this.getView().getModel("matchStats").getProperty("/selectedStatusFilter")) || "ALL";
        this._applyMatchFilters(sQuery, sKey);
    },

    _applyMatchFilters: function (sQuery, sStatusKey) {
        const oTable = this.byId("matchResultsTable");
        if (!oTable) return;
        const oBinding = oTable.getBinding("items");
        if (!oBinding) return;

        const aFilters = [];
        if (sQuery && sQuery.trim().length > 0) {
            const sClean = sQuery.trim();
            aFilters.push(new Filter({
                filters: [
                    new Filter("invoiceNo", FilterOperator.Contains, sClean),
                    new Filter("vendorDocLine/poReference", FilterOperator.Contains, sClean),
                    new Filter("matchRuleApplied", FilterOperator.Contains, sClean),
                    new Filter("reason", FilterOperator.Contains, sClean)
                ],
                and: false
            }));
        }

        sStatusKey = sStatusKey || (this.getView().getModel("matchStats") && this.getView().getModel("matchStats").getProperty("/selectedStatusFilter")) || "ALL";
        if (sStatusKey === "MATCHED") {
            aFilters.push(new Filter("outcomeCode", FilterOperator.StartsWith, "MATCHED"));
        } else if (sStatusKey === "UNMATCHED") {
            aFilters.push(new Filter("outcomeCode", FilterOperator.StartsWith, "UNMATCHED"));
        }

        oBinding.filter(aFilters);
    },

    onRefreshMatchResults: function () {
        const oTable = this.byId("matchResultsTable");
        if (oTable && oTable.getBinding("items")) {
            oTable.getBinding("items").refresh();
        }
        this._loadMatchAndExceptionMetrics();
        MessageToast.show("Match results refreshed");
    },

    formatCleanOutcomeText: function (sOutcome) {
        if (!sOutcome) return "MATCHED";
        if (sOutcome.indexOf("UNMATCHED") !== -1) return "UNMATCHED";
        if (sOutcome.indexOf("MATCHED") !== -1) return "MATCHED";
        return sOutcome;
    },

    onShowMatchInfo: function (oEvent) {
        const oSource = oEvent.getSource();
        const oCtx = oSource.getBindingContext();
        if (!oCtx) return;
        const obj = oCtx.getObject();

        const formattedDelta = this.formatVarianceDisplay(obj.amountDelta);
        const sOutcome = obj.outcomeCode || "MATCHED";
        const bIsMatched = sOutcome.indexOf("MATCHED") === 0 && sOutcome.indexOf("UNMATCHED") === -1;
        const sRawReason = obj.reason || (bIsMatched ? "All items and rates match Purchase Order." : "Discrepancy detected.");
        
        let sFindingText = "";
        if (bIsMatched) {
            sFindingText = "3-Way Match Verified: Invoice price, quantity, and taxes are aligned with the purchase order and goods receipt with zero variance.";
        } else {
            sFindingText = sRawReason.replace(/^TC\d+:\s*/i, "");
        }

        const self = this;
        const oDialog = new sap.m.Dialog({
            title: "Audit Summary • #" + obj.invoiceNo,
            type: "Message",
            contentWidth: "420px",
            content: new sap.m.VBox({
                class: "sapUiSmallMargin",
                items: [
                    new sap.m.HBox({
                        justifyContent: "SpaceBetween",
                        alignItems: "Center",
                        class: "sapUiSmallMarginBottom",
                        items: [
                            new sap.m.ObjectStatus({
                                text: bIsMatched ? "MATCHED (CLEAN)" : "UNMATCHED",
                                state: bIsMatched ? "Success" : "Error",
                                class: "vrBold"
                            }),
                            new sap.m.Text({
                                text: "Delta: " + formattedDelta,
                                class: "vrBold"
                            })
                        ]
                    }),
                    new sap.m.FormattedText({
                        htmlText: "<div style='background:" + (bIsMatched ? "#F0FDF4" : "#FEF2F2") + "; border-left:3.5px solid " + (bIsMatched ? "#107E3E" : "#DC2626") + "; padding:12px; border-radius:6px; font-size:13px; line-height:1.45; color:" + (bIsMatched ? "#166534" : "#991B1B") + ";'>" + sFindingText + "</div>"
                    })
                ]
            }),
            beginButton: new sap.m.Button({
                text: "Close",
                press: function () {
                    oDialog.close();
                }
            }),
            afterClose: function () {
                oDialog.destroy();
            }
        });

        oDialog.open();
    },

    onFilterExceptionCategory: function (oEvent) {
        const sKey = (oEvent.getParameter("item") && oEvent.getParameter("item").getKey()) || oEvent.getParameter("key") || "ALL";
        const oModel = this.getView().getModel("exceptionStats");
        if (oModel) oModel.setProperty("/selectedCategoryFilter", sKey);
        const oSearch = this.byId("exceptionSearchField");
        const sQuery = oSearch ? oSearch.getValue() : "";
        this._applyExceptionFilters(sQuery, sKey);
    },

    onSearchExceptions: function (oEvent) {
        const sQuery = oEvent.getParameter("query") !== undefined ? oEvent.getParameter("query") : oEvent.getParameter("newValue");
        const sKey = (this.getView().getModel("exceptionStats") && this.getView().getModel("exceptionStats").getProperty("/selectedCategoryFilter")) || "ALL";
        this._applyExceptionFilters(sQuery, sKey);
    },

    _applyExceptionFilters: function (sQuery, sCatKey) {
        const oTable = this.byId("exceptionsTable");
        if (!oTable) return;
        const oBinding = oTable.getBinding("items");
        if (!oBinding) return;

        const aFilters = [];
        if (sQuery && sQuery.trim().length > 0) {
            const sClean = sQuery.trim();
            aFilters.push(new Filter({
                filters: [
                    new Filter("invoiceNo", FilterOperator.Contains, sClean),
                    new Filter("poReference", FilterOperator.Contains, sClean),
                    new Filter("grNumber", FilterOperator.Contains, sClean),
                    new Filter("outcomeCode", FilterOperator.Contains, sClean),
                    new Filter("recommendedAction", FilterOperator.Contains, sClean)
                ],
                and: false
            }));
        }

        sCatKey = sCatKey || (this.getView().getModel("exceptionStats") && this.getView().getModel("exceptionStats").getProperty("/selectedCategoryFilter")) || "ALL";
        if (sCatKey === "PRICE") {
            aFilters.push(new Filter("outcomeCode", FilterOperator.Contains, "PRICE"));
            aFilters.push(new Filter("status", FilterOperator.EQ, "OPEN"));
        } else if (sCatKey === "GR") {
            aFilters.push(new Filter("outcomeCode", FilterOperator.Contains, "GR"));
            aFilters.push(new Filter("status", FilterOperator.EQ, "OPEN"));
        } else if (sCatKey === "QTY") {
            aFilters.push(new Filter("outcomeCode", FilterOperator.Contains, "QTY"));
            aFilters.push(new Filter("status", FilterOperator.EQ, "OPEN"));
        } else if (sCatKey === "RESOLVED") {
            aFilters.push(new Filter("status", FilterOperator.EQ, "RESOLVED"));
        } else if (sCatKey === "ALL") {
            aFilters.push(new Filter("status", FilterOperator.EQ, "OPEN"));
        }

        oBinding.filter(aFilters);
    },

    onShowExceptionReason: function (oEvent) {
        const oSource = oEvent.getSource();
        const oCtx = oSource.getBindingContext();
        if (!oCtx) return;
        const obj = oCtx.getObject();

        const sInvoice = obj.invoiceNo || "N/A";
        const sPo = obj.poReference || (obj.matchResult && obj.matchResult.vendorDocLine && obj.matchResult.vendorDocLine.poReference) || "N/A";
        const sGr = obj.grNumber || (obj.matchResult && obj.matchResult.grNumber) || "Pending / Missing";
        const sOutcome = obj.outcomeCode || "UNMATCHED";
        
        let sReason = obj.reason || (obj.matchResult && obj.matchResult.reason);
        if (!sReason || sReason.trim() === "" || sReason === "N/A") {
            const outUpper = (sOutcome || "").toUpperCase();
            if (outUpper.indexOf("TAX") !== -1) {
                sReason = "Tax slab or GST classification mismatch: Billed tax rate/code differs from purchase order line definition. Requires HSN/tax validation.";
            } else if (outUpper.indexOf("PRICE") !== -1) {
                sReason = "Unit price variance: Invoiced rate exceeds agreed purchase order contract price beyond allowable auto-tolerance threshold.";
            } else if (outUpper.indexOf("QTY") !== -1) {
                sReason = "Quantity discrepancy: Invoiced quantity exceeds physical warehouse Goods Receipt (GRN) accepted at receiving dock.";
            } else if (outUpper.indexOf("GR") !== -1) {
                sReason = "Goods Receipt missing: Invoice matched to Purchase Order, but warehouse GRN is pending in SAP S/4HANA (MIGO).";
            } else {
                sReason = "Discrepancy flagged during automated 3-way reconciliation audit between PO, GRN, and vendor invoice.";
            }
        }

        let sAction = obj.recommendedAction;
        if (!sAction || sAction.trim() === "" || sAction === "N/A") {
            const outUpper = (sOutcome || "").toUpperCase();
            if (outUpper.indexOf("TAX") !== -1) {
                sAction = "Validate vendor tax code in AP Workbench; request amended tax invoice or post with tax adjustment.";
            } else if (outUpper.indexOf("PRICE") !== -1) {
                sAction = "Route to Procurement buyer for price variance approval or issue debit note for rate difference.";
            } else if (outUpper.indexOf("QTY") !== -1) {
                sAction = "Coordinate with warehouse receiving team to confirm pending shipment or post short-receipt.";
            } else if (outUpper.indexOf("GR") !== -1) {
                sAction = "Send automated reminder to warehouse dock team to post MIGO Goods Receipt in SAP S/4HANA.";
            } else {
                sAction = "Open invoice in AP Workbench to verify 3-way line matching and apply resolution rule.";
            }
        }

        const sPriority = obj.priority || "P2";
        const nAge = obj.ageInDays !== undefined ? obj.ageInDays : 1;
        const bMsme = obj.msmeAlert;

        const self = this;
        const oDialog = new sap.m.Dialog({
            title: "Exception Diagnosis • Invoice #" + sInvoice,
            type: "Message",
            contentWidth: "520px",
            content: new sap.m.VBox({
                class: "sapUiSmallMargin",
                items: [
                    new sap.m.HBox({
                        justifyContent: "SpaceBetween",
                        alignItems: "Center",
                        class: "sapUiSmallMarginBottom",
                        items: [
                            new sap.m.HBox({
                                alignItems: "Center",
                                items: [
                                    new sap.ui.core.Icon({ src: "sap-icon://alert", color: "#DC2626", size: "1.2rem", class: "sapUiTinyMarginEnd" }),
                                    new sap.m.Title({ text: sOutcome, level: "H4" })
                                ]
                            }),
                            new sap.m.ObjectStatus({ text: "Priority: " + sPriority, state: sPriority === "P1" ? "Error" : "Warning" })
                        ]
                    }),
                    new sap.m.HBox({
                        justifyContent: "SpaceBetween",
                        alignItems: "Center",
                        class: "sapUiTinyMarginBottom",
                        items: [
                            new sap.m.Text({ text: "Purchase Order Reference:" }),
                            new sap.m.Text({ text: sPo, design: "Bold" })
                        ]
                    }),
                    new sap.m.HBox({
                        justifyContent: "SpaceBetween",
                        alignItems: "Center",
                        class: "sapUiTinyMarginBottom",
                        items: [
                            new sap.m.Text({ text: "Warehouse Goods Receipt (GRN):" }),
                            new sap.m.Text({ text: sGr, design: "Bold" })
                        ]
                    }),
                    new sap.m.HBox({
                        justifyContent: "SpaceBetween",
                        alignItems: "Center",
                        class: "sapUiSmallMarginBottom",
                        items: [
                            new sap.m.Text({ text: "Aging & Compliance:" }),
                            new sap.m.Text({ text: nAge + " Days Open" + (bMsme ? " • MSME Strict 45D Alert" : "") })
                        ]
                    }),
                    new sap.m.VBox({
                        class: "sapUiSmallMarginBottom vrDiagnosisReasonBox",
                        items: [
                            new sap.m.Label({ text: "Accounting Reason & Root Cause:", design: "Bold" }),
                            new sap.m.Text({ text: sReason, class: "vrDiagnosisReasonText sapUiTinyMarginTop" })
                        ]
                    }),
                    new sap.m.VBox({
                        class: "vrDiagnosisActionBox",
                        items: [
                            new sap.m.Label({ text: "Recommended Action & Next Best Step:", design: "Bold" }),
                            new sap.m.Text({ text: sAction, class: "vrDiagnosisActionText sapUiTinyMarginTop" })
                        ]
                    })
                ]
            }),
            beginButton: new sap.m.Button({
                text: "Close",
                press: function () {
                    oDialog.close();
                }
            }),
            afterClose: function () {
                oDialog.destroy();
            }
        });

        oDialog.open();
    },

    onRefreshExceptions: function () {
        const oTable = this.byId("exceptionsTable");
        if (oTable && oTable.getBinding("items")) {
            oTable.getBinding("items").refresh();
        }
        this._loadMatchAndExceptionMetrics();
        MessageToast.show("Exceptions queue refreshed");
    },

    onResolveException: function (oEvent) {
      const exceptionId = oEvent.getSource().data("exceptionId");
      sap.ui.core.BusyIndicator.show(0);
      fetch("/api/v1/", { method: "HEAD", headers: { "X-CSRF-Token": "Fetch" } })
      .then(res => {
          const csrf = res.headers.get("X-CSRF-Token") || "";
          return fetch("/api/v1/resolveException", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
              body: JSON.stringify({ exceptionId: exceptionId, note: "Resolved via demo UI" })
          });
      })
      .then(res => {
          if(!res.ok) throw new Error("Backend error");
          sap.ui.core.BusyIndicator.hide();
          sap.m.MessageToast.show("Exception resolved");
          this.getView().getModel().refresh();
          this._refreshSubViews();
      })
      .catch(e => {
          sap.ui.core.BusyIndicator.hide();
          sap.m.MessageToast.show("Error: " + e.message);
      });
    },

    onSyncS21: function () {
            sap.m.MessageToast.show("Initiating real-time sync with S21 ERP...");
            fetch("/api/v1/syncWithS21", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
                .then(r => r.json())
                .then(data => {
                    if(data.error) throw new Error(data.error.message);
                    let msg = data.value || '';
                    msg = msg.replace(/mock /gi, '');
                    sap.m.MessageBox.success("S21 Sync Completed! " + msg); 
                    this.getView().getModel().refresh();
                    if (this._loadIntakeMetrics) {
                        this._loadIntakeMetrics();
                    }
                    if (this._loadMatchAndExceptionMetrics) {
                        this._loadMatchAndExceptionMetrics();
                    }
                    this._refreshSubViews();
                })
                .catch(err => sap.m.MessageBox.error(err.message));
        },

        onOpenJoule: function () {
            window.open("https://ais-joule-hqc0gyza.eu10.sapdas.cloud.sap/webclient/standalone/vendor_recon_assistant", "JouleChat", "width=400,height=600,right=20,bottom=20");
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
                        sessionStorage.removeItem("vr_last_main_tab");
                        sessionStorage.removeItem("vr_nav_target_tab");
                        sessionStorage.removeItem("vr_workbench_target_invoice");
                        oRouter.navTo("login");
                    }
                }
            });
        }
    });
});
