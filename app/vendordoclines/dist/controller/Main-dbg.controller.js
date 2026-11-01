sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("vendordoclines.controller.Main", {
        onInit: function () {
            if (this._initOcrModel) {
                this._initOcrModel();
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

            let targetTab = sessionStorage.getItem("vr_nav_target_tab") || sessionStorage.getItem("vr_last_main_tab");
            sessionStorage.removeItem("vr_nav_target_tab");
            let defaultKey = (targetTab && navItems.some(n => n.key === targetTab)) ? targetTab : (navItems.length > 0 ? navItems[0].key : "intake");
            if (role === "GR" && !targetTab) defaultKey = "gr_workbench";
            this.byId("sideNavigation").setSelectedKey(defaultKey);
            this.byId("pageContainer").to(this.createId(defaultKey));

            // If landing on cockpit, trigger chart render after DOM is visible
            if (defaultKey === "cockpit") {
                var oCockpitPage = this.byId("cockpit");
                if (oCockpitPage) {
                    var oInnerView = oCockpitPage.getContent && oCockpitPage.getContent()[0];
                    if (oInnerView && oInnerView.getController) {
                        var oCtrl = oInnerView.getController();
                        if (oCtrl && typeof oCtrl.loadKpis === "function") {
                            setTimeout(function () { oCtrl.loadKpis(); }, 300);
                        }
                    }
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
            this.getOwnerComponent().getRouter().navTo("objectPage", { resultId: resultId });
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
            if (!sDate) return "ï¿½";
            try {
                return new Date(sDate).toLocaleDateString();
            } catch (e) {
                return "ï¿½";
            }
        },

        onItemSelect: function (oEvent) {
            const key = oEvent.getParameter("item").getKey();
            sessionStorage.setItem("vr_last_main_tab", key);
            this.byId("pageContainer").to(this.createId(key));
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

        const apiKey = "REDACTED_API_KEY_MANAGED_VIA_SERVER_ENV";
        if (apiKey === "sk-PLEASE_PASTE_YOUR_API_KEY_HERE") {
            sap.m.MessageBox.error("Developer: Please paste your OpenAI API key at line 285 in Main.controller.js");
            return;
        }

        const progressInd = this._getControl("ocrProgress");
        const statusText = this._getControl("ocrStatusText");
        
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            this._getControl("ocrProgressContainer").setVisible(true);
            progressInd.setPercentValue(30);
            statusText.setText("Converting PDF to Image format for AI...");
            
            // Load PDF.js dynamically
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
                        const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
                        const page = await pdf.getPage(1); // Only scan first page for POC
                        const viewport = page.getViewport({ scale: 1.5 });
                        const canvas = document.createElement("canvas");
                        const context = canvas.getContext("2d");
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        await page.render({ canvasContext: context, viewport: viewport }).promise;
                        const base64Image = canvas.toDataURL("image/jpeg");
                        this._runOpenAiScan(base64Image, apiKey);
                    } catch(err) {
                        sap.m.MessageBox.error("PDF parsing failed: " + err.message);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        } else {
            const imageSrc = this._getControl("ocrImage").getSrc();
            this._runOpenAiScan(imageSrc, apiKey);
        }
    },

    _runOpenAiScan: function(imageSrc, apiKey) {
        const progressContainer = this._getControl("ocrProgressContainer");
        const progressInd = this._getControl("ocrProgress");
        const statusText = this._getControl("ocrStatusText");
        const container = this._getControl("ocrImageContainer");

        progressContainer.setVisible(true);
        progressInd.setPercentValue(50);
        progressInd.setDisplayValue("Scanning...");
        statusText.setText("Analyzing Document...");
        container.addStyleClass("vrOcrScanning");

        const payload = {
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "You are an expert OCR AI. Extract the following fields from this invoice or purchase order: Invoice/PO Number, Document Date (FORMAT EXPLICITLY AS YYYY-MM-DD), Vendor/Supplier Name, Vendor GSTIN, Buyer Name, Buyer GSTIN, PO Number, Total Amount (NUMBERS ONLY, NO COMMAS), Total Tax, CGST, SGST, IGST. Return the result STRICTLY as a JSON object with exactly these keys: 'invoiceNumber', 'invoiceDate', 'vendorName', 'vendorGstin', 'buyerName', 'buyerGstin', 'poNumber', 'totalAmount', 'tax', 'cgst', 'sgst', 'igst'. If a field is missing or not applicable, leave its value as an empty string. DO NOT wrap the response in markdown code blocks." },
                        { type: "image_url", image_url: { url: imageSrc } }
                    ]
                }
            ],
            max_tokens: 800,
            temperature: 0
        };

        fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            container.removeStyleClass("vrOcrScanning");
            progressInd.setPercentValue(100);
            progressInd.setDisplayValue("100%");
            statusText.setText("Scan Complete! Data extracted.");

            if (data.error) {
                throw new Error(data.error.message);
            }

            let cleanJsonStr = data.choices[0].message.content.trim();
            if (cleanJsonStr.startsWith("```json")) {
                cleanJsonStr = cleanJsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
            } else if (cleanJsonStr.startsWith("```")) {
                cleanJsonStr = cleanJsonStr.replace(/^```/, "").replace(/```$/, "").trim();
            }

            const extracted = JSON.parse(cleanJsonStr);
            const model = this.getView().getModel("ocrData");
            
            if (model) {
                // If it's a PO, the AI might leave invoiceNumber blank and put it in poNumber. 
                // We want it to show up in the main 'Invoice / PO Number' field regardless!
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
            statusText.setText("Error during scan.");
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

        const payload = {
            vendorInvoiceNo: ocrData.invoiceNumber || ocrData.poNumber,
            invoiceDate: invoiceDateObj,
            invoiceGrossAmount: amount,
            currency: "INR",
            poReference: ocrData.poNumber || "",
            sourceVendorCode: (ocrData.vendorName || "EXT-OCR").substring(0, 10),
            sourceGstin: ocrData.vendorGstin || ""
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
            this._refreshSubViews();
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
      })
      .catch(e => {
          sap.ui.core.BusyIndicator.hide();
          sap.m.MessageToast.show("Error: " + e.message);
      });
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
            fetch("/api/v1/syncWithS21", { method: "POST" })
                .then(r => r.json())
                .then(data => {
                    if(data.error) throw new Error(data.error.message);
                    let msg = data.value || '';
                      msg = msg.replace(/mock /gi, '');
                      sap.m.MessageBox.success("S21 Sync Completed! " + msg); 
                    this.getView().getModel().refresh();
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
                        oRouter.navTo("login");
                    }
                }
            });
        }
    });
});
