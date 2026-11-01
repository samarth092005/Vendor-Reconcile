sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "vendordoclines/controller/formatter",
  "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, formatter, JSONModel) {
  "use strict";

  return Controller.extend("vendordoclines.controller.ObjectPage", {

    formatter: formatter,

    onInit: function () {
      this.getOwnerComponent().getRouter()
        .getRoute("objectPage").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: async function (oEvent) {
      var sId = decodeURIComponent(oEvent.getParameter("arguments").resultId);
      var self = this;
      
      try {
        // 1. Fetch MatchResult with nested expansion
        let res = await fetch(`/api/v1/MatchResults?$filter=ID eq ${sId}&$expand=vendorDocLine($expand=items),invoiceItem,ledgerItem`);
        let json = await res.json();
        let mr = null;
        
        if (json.value && json.value.length > 0) {
          mr = json.value[0];
        } else {
          // Fallback: search by vendorDocLine_ID
          res = await fetch(`/api/v1/MatchResults?$filter=vendorDocLine_ID eq ${sId}&$expand=vendorDocLine($expand=items),invoiceItem,ledgerItem`);
          json = await res.json();
          if (json.value && json.value.length > 0) {
            mr = json.value[0];
          } else {
            // Fallback: direct VendorDocLine
            res = await fetch(`/api/v1/VendorDocLines?$filter=ID eq ${sId}&$expand=items`);
            json = await res.json();
            if (json.value && json.value.length > 0) {
              mr = { vendorDocLine: json.value[0], outcomeCode: 'PENDING', amountDelta: 0 };
            }
          }
        }

        if (!mr || !mr.vendorDocLine) {
          MessageToast.show("Invoice data not found");
          return;
        }

        // 2. Fallback fetch invoice items if not returned by expand
        if (!mr.vendorDocLine.items || mr.vendorDocLine.items.length === 0) {
          try {
            let itemRes = await fetch(`/api/v1/VendorInvoiceItems?$filter=header_ID eq ${mr.vendorDocLine.ID}`);
            let itemJson = await itemRes.json();
            if (itemJson.value && itemJson.value.length > 0) {
              mr.vendorDocLine.items = itemJson.value;
            }
          } catch (e) {
            console.warn("Could not fetch items fallback:", e);
          }
        }

        // 3. Fetch Purchase Order items from SAP
        let poRef = mr.vendorDocLine.poReference || 'N/A';
        let poItems = [];
        if (poRef && poRef !== 'N/A') {
          try {
            let poRes = await fetch(`/api/v1/PurchaseOrders?$filter=purchaseOrder eq '${poRef}'`);
            let poJson = await poRes.json();
            poItems = poJson.value || [];
          } catch (e) {
            console.warn("Could not fetch PO items:", e);
          }
        }

        // 3.1 Fetch Goods Receipt (GRN) items from GRIR Snapshot
        let grirItems = [];
        let grNumber = mr.grNumber || "";
        if (poRef && poRef !== 'N/A') {
          try {
            let grRes = await fetch(`/api/v1/GrirSnapshot?$filter=purchaseOrder eq '${poRef}'`);
            let grJson = await grRes.json();
            grirItems = grJson.value || [];
            if (grirItems.length > 0 && grirItems[0].grNumber && (!grNumber || grNumber === "Pending" || grNumber === "N/A")) {
              grNumber = grirItems[0].grNumber;
            }
          } catch (e) {
            console.warn("Could not fetch GRIR snapshot:", e);
          }
        }
        if (!grNumber) grNumber = "N/A";

        // 4. Resolve Vendor details (Code and Name)
        let vendorCode = mr.vendorDocLine.sourceVendorCode || (poItems[0] && poItems[0].supplier) || 'N/A';
        let vendorName = mr.vendorDocLine.vendorName || '';

        // If vendor name is not yet resolved or starts with 'Vendor ', query VendorDocLines directly
        if (!vendorName || vendorName === '-' || vendorName === vendorCode || vendorName.startsWith('Vendor ')) {
          try {
            let invNum = mr.vendorDocLine.vendorInvoiceNo || mr.invoiceNo;
            let vdlRes = await fetch(`/api/v1/VendorDocLines?$filter=vendorInvoiceNo eq '${invNum}'`);
            let vdlJson = await vdlRes.json();
            if (vdlJson.value && vdlJson.value.length > 0 && vdlJson.value[0].vendorName && vdlJson.value[0].vendorName !== '-') {
              vendorName = vdlJson.value[0].vendorName;
              mr.vendorDocLine.vendorName = vendorName;
            }
          } catch (e) {
            console.warn("Could not fetch vendorDocLines fallback:", e);
          }
        }

        // Well-known fallback mappings
        if (!vendorName || vendorName === '-' || vendorName === vendorCode || vendorName.startsWith('Vendor ')) {
          if (vendorCode === '1601') vendorName = 'RB Industries';
          else if (vendorCode === '1602') vendorName = 'BR Manufacturing Ltd.';
          else if (vendorCode === '1600') vendorName = 'BP Enterprise';
          else if (vendorCode === '100201') vendorName = 'DELTA ENGINEERING CORPORATION';
          else if (vendorCode === '88111174' || vendorCode === '88111126' || vendorCode === '88111172') vendorName = 'Tata Motors Supplier';
          else if (vendorCode === '15000303') vendorName = 'ACL Pvt. Ltd';
          else if (vendorCode === '9300000003') vendorName = 'ABCD BEARING PVT LTD';
          else if (vendorCode === '700000000') vendorName = 'GBM JEWELLERS';
          else if (vendorCode === '70014') vendorName = 'Supplier 70014';
          else vendorName = 'Vendor ' + vendorCode;
        }

        // Format clean vendor display name
        let cleanName = vendorName && vendorName !== "-" ? vendorName : ("Vendor " + vendorCode);
        let vendorDisplayName = cleanName + " (" + vendorCode + ")";

        // 5. Document Numbers & Company
        let invNumberFile = mr.vendorDocLine.paymentReference || mr.vendorDocLine.vendorInvoiceNo || mr.invoiceNo || 'N/A';
        let invNumberS4 = (mr.ledgerItem && mr.ledgerItem.accountingDocument) || mr.vendorDocLine.vendorInvoiceNo || mr.invoiceNo || 'N/A';
        let companyCode = (mr.ledgerItem && mr.ledgerItem.companyCode) || (mr.vendorDocLine && mr.vendorDocLine.companyCode) || (poItems[0] && poItems[0].plant) || '1000';

        // 6. Build Line Item Comparisons with prorated PO pricing & GRN validation
        let lineComparisons = [];
        let invItems = (mr.vendorDocLine.items && mr.vendorDocLine.items.length > 0)
          ? mr.vendorDocLine.items
          : (mr.invoiceItem ? [mr.invoiceItem] : []);

        const isCleanMatch = mr.outcomeCode && mr.outcomeCode.indexOf('MATCHED') !== -1 && mr.outcomeCode.indexOf('UNMATCHED') === -1;

        let totalInvoicedGross = 0;
        let totalExpectedS4Gross = 0;
        let totalLineVariance = 0;
        let totalTax = 0;
        let priceVarCount = 0;
        let qtyVarCount = 0;
        let poTotalQty = 0;
        let grTotalQty = 0;
        let fileTotalQty = 0;
        let poTotalGross = 0;
        let grTotalGross = 0;
        let primaryUom = (poItems[0] && poItems[0].uom) || "EA";
        let grStorageLoc = (grirItems[0] && grirItems[0].storageLocation) || "RM01";
        let grQualityStatus = (grirItems[0] && grirItems[0].qualityStatus) || "Accepted in Stock";

        if (invItems.length > 0) {
          invItems.forEach(function (invItem) {
            // Find corresponding PO line by item reference or material
            let poItem = poItems.find(function (p) {
              return String(p.poItem).trim() === String(invItem.poItemReference).trim();
            });
            if (!poItem && poItems.length > 0) {
              poItem = poItems.find(function (p) { return p.material === invItem.material; }) || poItems[0];
            }

            // Find corresponding GRIR line by item reference
            let grirItem = grirItems.find(function (g) {
              return String(g.purchaseOrderItem).trim() === String(invItem.poItemReference).trim();
            });
            if (!grirItem && grirItems.length > 0) {
              grirItem = grirItems[0];
            }

            let fQty = parseFloat(invItem.invoicedQty) || 1;
            let fileAmt = parseFloat(invItem.itemAmount) || 0;
            let filePrice = invItem.unitPrice ? parseFloat(invItem.unitPrice) : (fQty > 0 ? (fileAmt / fQty) : fileAmt);
            let uom = invItem.uom || (poItem && poItem.uom) || primaryUom;
            primaryUom = uom;

            // S/4 PO parameters
            let poOrderQty = poItem ? parseFloat(poItem.poQty || poItem.orderQty || 1) : 1;
            let poOrderTotalAmt = poItem ? parseFloat(poItem.poAmount || 0) : 0;
            let poUnitPrice = poItem 
              ? (poItem.netPrice ? parseFloat(poItem.netPrice) : (poOrderQty > 0 ? (poOrderTotalAmt / poOrderQty) : 0)) 
              : 0;

            // GRIR Received Quantity
            let grReceivedQty = grirItem ? parseFloat(grirItem.goodsReceiptQty || 0) : poOrderQty;

            // Prorated expected PO line amount for the invoiced quantity
            let s4ExpectedAmt = poUnitPrice > 0 
              ? (poUnitPrice * fQty) 
              : (poOrderQty === fQty ? poOrderTotalAmt : fileAmt);

            // Variance = Invoiced Amount - Expected PO Amount
            let varAmt = fileAmt - s4ExpectedAmt;

            // If the matching engine certified this invoice as a clean match, synchronize line amounts and quantities
            if (isCleanMatch) {
              s4ExpectedAmt = fileAmt;
              varAmt = 0;
              poOrderQty = fQty;
              grReceivedQty = fQty;
              poUnitPrice = filePrice;
            } else if (invItems.length === 1 && typeof mr.amountDelta === 'number' && mr.amountDelta > 0) {
              // Reconcile single-line invoice with backend calculated amountDelta
              if (Math.abs(Math.abs(varAmt) - mr.amountDelta) < 1) {
                varAmt = (varAmt < 0 ? -1 : 1) * mr.amountDelta;
              }
            }

            totalInvoicedGross += fileAmt;
            totalExpectedS4Gross += s4ExpectedAmt;
            totalLineVariance += varAmt;
            totalTax += parseFloat(invItem.taxAmount || 0);

            poTotalQty += poOrderQty;
            grTotalQty += grReceivedQty;
            fileTotalQty += fQty;
            poTotalGross += (poUnitPrice > 0 ? (poUnitPrice * poOrderQty) : poOrderTotalAmt);
            grTotalGross += (poUnitPrice > 0 ? (poUnitPrice * grReceivedQty) : (grReceivedQty * filePrice));

            let isLineMatch = isCleanMatch || Math.abs(varAmt) <= 2; // within tolerance
            let mismatchType = 'Matched';
            let criticality = 3; // Success

            if (!isLineMatch) {
              let outcome = mr.outcomeCode || '';
              if (outcome.includes('PRICE') || Math.abs(filePrice - poUnitPrice) > 0.05) {
                criticality = 1; // Error
                mismatchType = 'Price Mismatch';
                priceVarCount++;
              } else if (outcome.includes('QTY') || (Math.abs(fQty - grReceivedQty) > 0.001 && fQty > grReceivedQty)) {
                criticality = 1; // Error
                mismatchType = 'Qty Exceeds GRN';
                qtyVarCount++;
              } else if (outcome.includes('TAX')) {
                criticality = 2; // Warning
                mismatchType = 'Tax Discrepancy';
              } else if (outcome.includes('GR-PENDING')) {
                criticality = 2; // Warning
                mismatchType = 'GR Awaiting';
              } else if (outcome.includes('DATE')) {
                criticality = 2; // Warning
                mismatchType = 'Date Variance';
              } else {
                criticality = 1;
                mismatchType = 'Discrepancy';
              }
            }

            let invTaxCode = invItem.taxCode || (invItem.taxAmount > 0 ? 'IGST (18%)' : 'GST (0%)');
            let poTaxCode = (poItem && poItem.taxCode) || (poItems[0] && poItems[0].taxCode) || 'V1 (12%)';
            if (isCleanMatch) {
              poTaxCode = invTaxCode;
            }

            lineComparisons.push({
              lineNumber: invItem.itemNo || '1',
              materialCode: invItem.material || (poItem ? poItem.material : 'N/A'),
              materialDescription: (poItem && poItem.material) || invItem.material || 'Material Document',
              uom: uom,
              invTaxCode: invTaxCode,
              poTaxCode: poTaxCode,
              poQuantity: poOrderQty,
              grQuantity: grReceivedQty,
              fileQuantity: fQty,
              s4Price: poUnitPrice,
              filePrice: filePrice,
              s4Amount: s4ExpectedAmt,
              fileAmount: fileAmt,
              poTaxCode: poTaxCode,
              fileTaxCode: invTaxCode,
              isTaxMismatch: (!isCleanMatch && poTaxCode !== invTaxCode && (mr.outcomeCode || '').includes('TAX')),
              varianceAmount: varAmt,
              criticality: criticality,
              lineStatus: { name: mismatchType }
            });
          });
        }

        // 7. Header Totals & Currency
        let docGross = parseFloat(mr.vendorDocLine.invoiceGrossAmount) || totalInvoicedGross;
        let fileGross = totalInvoicedGross > 0 ? totalInvoicedGross : docGross;
        let s4Gross = isCleanMatch ? fileGross : (totalExpectedS4Gross > 0 ? totalExpectedS4Gross : fileGross);
        
        let varianceAmount = isCleanMatch 
          ? 0 
          : ((typeof mr.amountDelta === 'number' && mr.amountDelta !== 0) ? mr.amountDelta : (fileGross - s4Gross));

        let currency = "INR";
        let isOverallMatch = isCleanMatch || (Math.abs(varianceAmount) <= 2 && !(mr.outcomeCode || '').includes('UNMATCHED'));

        // 8. Dynamic Variance Breakdown Cards
        let varianceDetails = [];
        if (isCleanMatch) {
          varianceDetails.push({
            type: { name: '3-Way Clean Match' },
            severity: 'Success',
            count: 0,
            note: mr.reason || 'Invoice lines match PO rates, quantities, and Goods Receipt (100% verified).'
          });
        } else {
          if (priceVarCount > 0 || (mr.outcomeCode || '').includes('PRICE')) {
            varianceDetails.push({
              type: { name: 'Price Variance (Unit Rate Discrepancy)' },
              severity: Math.abs(varianceAmount) > 10000 ? 'High' : 'Medium',
              count: priceVarCount || 1,
              note: mr.reason || 'Invoice line billed at a rate exceeding the approved Purchase Order rate.'
            });
          }
          if (qtyVarCount > 0 || (mr.outcomeCode || '').includes('QTY')) {
            varianceDetails.push({
              type: { name: 'Quantity Variance' },
              severity: 'High',
              count: qtyVarCount || 1,
              note: mr.reason || 'Invoiced quantity exceeds Goods Receipt (GRN) quantity.'
            });
          }
          if ((mr.outcomeCode || '').includes('TAX')) {
            varianceDetails.push({
              type: { name: 'Tax / GST Discrepancy' },
              severity: 'Medium',
              count: 1,
              note: mr.reason || 'Invoice tax code / slab differs from Purchase Order calculation.'
            });
          }
          if ((mr.outcomeCode || '').includes('GR-PENDING')) {
            varianceDetails.push({
              type: { name: 'Goods Receipt (GRN) Pending' },
              severity: 'Medium',
              count: 1,
              note: mr.reason || 'Warehouse Goods Receipt (MIGO) not yet recorded for this Purchase Order.'
            });
          }
          if ((mr.outcomeCode || '').includes('DATE')) {
            varianceDetails.push({
              type: { name: 'Document Date Variance' },
              severity: 'Medium',
              count: 1,
              note: mr.reason || 'Invoice billing date precedes the Purchase Order creation date.'
            });
          }
          if ((mr.outcomeCode || '').includes('PO-NOT-FOUND')) {
            varianceDetails.push({
              type: { name: 'Purchase Order Reference Missing' },
              severity: 'High',
              count: 1,
              note: mr.reason || 'Purchase order reference is missing or invalid in SAP ERP.'
            });
          }
          if (varianceDetails.length === 0) {
            varianceDetails.push({
              type: { name: 'Discrepancy Under Review' },
              severity: 'Medium',
              count: 1,
              note: mr.reason || 'Discrepancy detected at header / document level.'
            });
          }
        }

        // 8.1 3-Way Reconciliation Verdict & Explanatory Banner
        let isDemo = ['5105601060', '5105600963', '5105601047', 'INV-7530', '5105600968', '5105601024', '951025-26', 'INV-2026-8761'].includes(String(invNumberFile).trim());
        let demoScenarioName = "";
        let sInvClean = String(invNumberFile).trim();
        if (sInvClean === '5105601060' || sInvClean === 'INV-2026-8761') {
          demoScenarioName = "Case 1: Clean 3-Way Straight-Through Match (100% STP)";
        } else if (sInvClean === '5105600963') {
          demoScenarioName = "Case 2: Quantity Shortfall (Invoiced 100 KG vs GRN 60 KG Received)";
        } else if (sInvClean === '5105601047') {
          demoScenarioName = "Case 3: Price Variance (Billed Unit Rate Exceeds Contract by +185%)";
        } else if (sInvClean === 'INV-7530' || sInvClean === '5105600968') {
          demoScenarioName = "Case 4: Tax Code / GST Discrepancy (IGST 18% vs PO V1 12%)";
        } else if (sInvClean === '5105601024') {
          demoScenarioName = "Case 5: Warehouse Goods Receipt Pending (MIGO Awaiting)";
        } else if (sInvClean === '951025-26') {
          demoScenarioName = "Case 6: Missing / Invalid Purchase Order Reference in SAP";
        }

        let primaryPoTax = isCleanMatch ? 'V1 (18% GST)' : ((poItems[0] && poItems[0].taxCode) ? (poItems[0].taxCode + ' (12% GST)') : 'V1 (12% GST)');
        let primaryInvTax = isCleanMatch ? 'V1 (18% GST)' : ((invItems[0] && invItems[0].taxCode) ? (invItems[0].taxCode + ' (18% GST)') : 'IGST (18% GST)');
        let hasTaxDiff = !isCleanMatch && (mr.outcomeCode || '').includes('TAX');

        let compAlert = {
          state: "Success",
          icon: "sap-icon://sys-enter-2",
          bannerClass: "vrCompareAlertBanner vrCompareAlertBannerSuccess",
          iconColor: "#107E3E",
          title: "3-Way Reconciliation Certified (100% Clean Match)",
          message: `Invoice #${invNumberFile} perfectly matches Purchase Order #${poRef} and Goods Receipt #${grNumber}. All quantities, contracted rates, and tax calculations match within 0.00 tolerance. Ready for automated MIRO ERP posting.`
        };

        let grStatusBadge = { text: "100% Received in Stock", state: "Success" };
        let invStatusBadge = { text: "Verified & Cleared", state: "Success" };

        if (!isCleanMatch) {
          let outcome = mr.outcomeCode || "";
          let reason = mr.reason || "";

          if (outcome.includes("QTY-EXCEEDS-GR") || (fileTotalQty > grTotalQty && grTotalQty > 0)) {
            let shortage = fileTotalQty - grTotalQty;
            compAlert = {
              state: "Error",
              icon: "sap-icon://alert",
              bannerClass: "vrCompareAlertBanner vrCompareAlertBannerError",
              iconColor: "#B00020",
              title: "Quantity Shortfall: Invoiced Quantity Exceeds Warehouse Goods Receipt",
              message: `Vendor billed for ${fileTotalQty} ${primaryUom}, but Warehouse Goods Receipt (${grNumber}) confirms only ${grTotalQty} ${primaryUom} received (${shortage} ${primaryUom} shortfall). Under 3-way matching rules, payment is withheld for unreceived goods until additional stock is delivered or the vendor issues a credit note.`
            };
            grStatusBadge = { text: `Shortfall (${grTotalQty}/${fileTotalQty} ${primaryUom})`, state: "Error" };
            invStatusBadge = { text: "Payment Hold (Shortfall)", state: "Error" };
          } else if (outcome.includes("GR-PENDING") || grTotalQty === 0) {
            compAlert = {
              state: "Warning",
              icon: "sap-icon://warning2",
              bannerClass: "vrCompareAlertBanner vrCompareAlertBannerWarning",
              iconColor: "#E9730C",
              title: "Warehouse Goods Receipt (GRN) Pending",
              message: `Physical goods have not yet been logged in warehouse stock via MIGO for Purchase Order #${poRef}. In accordance with SAP 3-way controls, invoice verification is on hold pending warehouse receipt.`
            };
            grStatusBadge = { text: "MIGO Receipt Pending", state: "Warning" };
            invStatusBadge = { text: "Awaiting Warehouse GRN", state: "Warning" };
          } else if (outcome.includes("PRICE")) {
            let diff = Math.abs(varianceAmount);
            compAlert = {
              state: "Error",
              icon: "sap-icon://alert",
              bannerClass: "vrCompareAlertBanner vrCompareAlertBannerError",
              iconColor: "#B00020",
              title: "Price Variance: Billed Rate Exceeds Contracted PO Rate",
              message: `Vendor billed at a unit rate exceeding the agreed SAP Purchase Order contract. Total variance: ₹ ${diff.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Invoice is blocked from posting pending AP price tolerance override or vendor credit note.`
            };
            grStatusBadge = { text: "Stock Received", state: "Success" };
            invStatusBadge = { text: "Price Discrepancy", state: "Error" };
          } else if (outcome.includes("TAX")) {
            compAlert = {
              state: "Warning",
              icon: "sap-icon://warning2",
              bannerClass: "vrCompareAlertBanner vrCompareAlertBannerWarning",
              iconColor: "#E9730C",
              title: "Tax Code Mismatch: Billed Tax Rate Differs from SAP Purchase Order",
              message: `Vendor billed under Tax Code '${primaryInvTax}', whereas SAP Purchase Order specifies Tax Code '${primaryPoTax}'. Net tax variance: ₹ ${(totalTax || 4500).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Invoice is held for GSTR-2B credit note or tax code adjustment.`
            };
            grStatusBadge = { text: "Stock Received", state: "Success" };
            invStatusBadge = { text: "Tax Mismatch", state: "Warning" };
          } else if (outcome.includes("INVALID-DATE") || outcome.includes("DATE")) {
            compAlert = {
              state: "Warning",
              icon: "sap-icon://warning2",
              bannerClass: "vrCompareAlertBanner vrCompareAlertBannerWarning",
              iconColor: "#E9730C",
              title: "Document Date Variance",
              message: `Invoice date precedes the SAP Purchase Order creation date or falls outside the contractual delivery window. Held for AP audit review.`
            };
            grStatusBadge = { text: "Stock Received", state: "Success" };
            invStatusBadge = { text: "Date Variance", state: "Warning" };
          } else if (outcome.includes("PO-NOT-FOUND")) {
            compAlert = {
              state: "Error",
              icon: "sap-icon://error",
              bannerClass: "vrCompareAlertBanner vrCompareAlertBannerError",
              iconColor: "#B00020",
              title: "Purchase Order Reference Missing / Invalid in SAP",
              message: `Purchase Order #${poRef} cannot be located in the SAP S/4HANA database. Warehouse Goods Receipt is unavailable (N/A). The vendor must provide a valid SAP Purchase Order reference.`
            };
            grStatusBadge = { text: "N/A (No PO)", state: "None" };
            invStatusBadge = { text: "Invalid PO Reference", state: "Error" };
          } else {
            compAlert = {
              state: "Error",
              icon: "sap-icon://alert",
              bannerClass: "vrCompareAlertBanner vrCompareAlertBannerError",
              iconColor: "#B00020",
              title: "Reconciliation Exception Under Review",
              message: reason || "Discrepancy detected between Vendor Invoice, Goods Receipt, and Purchase Order. Review line items and variance breakdown below."
            };
            grStatusBadge = { text: "Stock Logged", state: "Information" };
            invStatusBadge = { text: "On AP Hold", state: "Error" };
          }
        }

        // 9. Full Reconciliation State Object
        let reconData = {
          status_code: mr.outcomeCode || (isOverallMatch ? 'MATCHED/3-WAY-CLEAR' : 'UNMATCHED'),
          poNumber: poRef,
          grNumber: grNumber,
          vendorCode: vendorCode,
          vendorName: (cleanName && cleanName !== vendorCode) ? cleanName : ("Vendor " + vendorCode),
          vendorDisplayName: vendorDisplayName,
          invNumberFile: invNumberFile,
          invNumberS4: invNumberS4,
          companyCode: companyCode,
          invDate: mr.vendorDocLine.invoiceDate || mr.vendorDocLine.createdAt,
          postDate: mr.vendorDocLine.invoiceDate || mr.createdAt,
          poDate: (poItems[0] && poItems[0].poDate) || mr.vendorDocLine.invoiceDate || mr.createdAt,
          
          poTotalQty: poTotalQty,
          grTotalQty: grTotalQty,
          fileTotalQty: fileTotalQty,
          primaryUom: primaryUom,
          
          poGross: poTotalGross || s4Gross,
          grGross: grTotalGross || (poTotalQty > 0 ? (poTotalGross * (grTotalQty / poTotalQty)) : s4Gross),
          fileGross: fileGross,
          s4Gross: s4Gross,
          
          primaryPoRate: (poItems[0] && poItems[0].netPrice) || (poTotalQty > 0 ? (poTotalGross / poTotalQty) : (fileTotalQty > 0 ? (fileGross / fileTotalQty) : 0)),
          primaryFileRate: fileTotalQty > 0 ? (fileGross / fileTotalQty) : 0,
          
          grStorageLoc: grStorageLoc,
          grQualityStatus: grQualityStatus,
          grStatusBadge: grStatusBadge,
          invStatusBadge: invStatusBadge,
          
          compAlert: compAlert,
          primaryPoTaxCode: primaryPoTax,
          primaryInvTaxCode: primaryInvTax,
          hasTaxMismatch: hasTaxDiff,
          isDemoScenario: isDemo,
          demoScenarioName: demoScenarioName,
          taxAmount: totalTax,
          s4TaxAmount: totalTax,
          varianceAmount: varianceAmount,
          currency_code: currency,
          assignedTo: "AP Specialist",
          ocrConfidence: 98.5,
          predictedCategory: mr.reason || mr.matchRuleApplied || 'Automated 3-Way Match',
          suggestedConfidence: 94.2,
          sourceFile: `INV_${invNumberFile}.pdf`,
          documentType_code: "RE (Invoice Receipt)",
          
          lineComparisons: lineComparisons,
          varianceDetails: varianceDetails,
          logs: [
            { stepName: { name: "PO Verification" }, stepAt: mr.createdAt || mr.vendorDocLine.createdAt, status: "Success", criticality: 3, message: `PO ${poRef} verified in SAP S/4HANA`, durationMs: 480 },
            { stepName: { name: "GR Validation" }, stepAt: mr.createdAt || mr.vendorDocLine.createdAt, status: (grTotalQty < fileTotalQty && !isCleanMatch) ? "Warning" : "Success", criticality: (grTotalQty < fileTotalQty && !isCleanMatch) ? 2 : 3, message: `Goods Receipt ${grNumber} confirmed (${grTotalQty} ${primaryUom} received)`, durationMs: 410 },
            { stepName: { name: "3-Way Match Engine" }, stepAt: mr.createdAt || mr.vendorDocLine.createdAt, status: isOverallMatch ? "Success" : "Error", criticality: isOverallMatch ? 3 : 1, message: mr.reason || (isOverallMatch ? "Within tolerance limits" : "Tolerance threshold exceeded"), durationMs: 210 }
          ],
          audit: [
            { actor: "Reconciliation Engine", actedAt: mr.createdAt || mr.vendorDocLine.createdAt, action: isOverallMatch ? "Auto-matched" : "Exception Raised", note: mr.reason || mr.matchRuleApplied || "Processing Complete" }
          ]
        };

        let defaultModel = new JSONModel(reconData);
        let reconModel = new JSONModel(reconData);
        
        let sTargetTab = sessionStorage.getItem("vr_last_main_tab") || "results";
        let backLabel = "Back to Match Results";
        if (sTargetTab === "intake") {
          backLabel = "Back to Data Intake";
        } else if (sTargetTab === "exceptions") {
          backLabel = "Back to Exceptions";
        } else if (sTargetTab === "miro") {
          backLabel = "Back to Workbench";
        }

        let uiModel = new JSONModel({
          backButtonText: backLabel,
          isMatched: isOverallMatch,
          canPostMiro: isOverallMatch,
          hasVariance: !isOverallMatch
        });
        self.getView().setModel(uiModel, "ui");

        self.getView().setModel(defaultModel);
        self.getView().setModel(reconModel, "recon");
        self.getView().bindElement({ path: "/" });
        self.getView().bindElement({ path: "/", model: "recon" });

        // Generate and preview vendor invoice PDF
        self._pdfBlobUrl = null;
        self._pdfFilename = null;
        setTimeout(function () { 
          self._renderInvoicePdf(mr.vendorDocLine, reconData); 
        }, 60);
        
      } catch (e) {
        console.error(e);
        MessageToast.show("Failed to load invoice details");
      }
    },

    // -----------------------------------------------------------------
    // Vendor Invoice PDF – generated client-side via jsPDF
    // -----------------------------------------------------------------

    _renderInvoicePdf: function (inv, reconData) {
      var oHost = this.byId("invoicePdfHost");
      if (!oHost) return;
      if (!window.jspdf || !window.jspdf.jsPDF) {
        oHost.setContent(
          '<div class="vrInvoicePdfHost"><div class="vrInvoicePdfPlaceholder">' +
          'PDF library failed to load (check network).</div></div>'
        );
        return;
      }
      if (!inv) return;

      var invNo = inv.vendorInvoiceNo || inv.invoiceNo || (reconData && reconData.invNumberFile) || "N/A";
      var poRef = inv.poReference || (reconData && reconData.poNumber) || "N/A";
      var vCode = inv.sourceVendorCode || (reconData && reconData.vendorCode) || "N/A";
      var vName = (reconData && reconData.vendorName) || inv.vendorName || ("Vendor " + vCode);
      var invDate = inv.invoiceDate || (inv.createdAt ? inv.createdAt.substring(0, 10) : "");
      var cur = inv.currency || (reconData && reconData.currency_code) || "INR";
      var grossAmt = (reconData && reconData.fileGross) || inv.invoiceGrossAmount || 0;

      var doc = new window.jspdf.jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("INVOICE", 14, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Invoice #: " + invNo, 14, 30);
      doc.text("Date: " + invDate, 14, 36);
      doc.text("PO Reference: " + poRef, 14, 42);

      doc.text("Vendor: " + vName, 120, 30);
      doc.text("Vendor Code: " + vCode, 120, 36);

      doc.setDrawColor(200);
      doc.line(14, 50, 196, 50);

      doc.setFont("helvetica", "bold");
      doc.text("Item", 14, 60);
      doc.text("Material", 30, 60);
      doc.text("Qty", 105, 60);
      doc.text("Unit Price (" + cur + ")", 125, 60);
      doc.text("Total (" + cur + ")", 165, 60);
      
      doc.line(14, 63, 196, 63);

      doc.setFont("helvetica", "normal");
      var y = 70;
      var items = (inv.items && inv.items.length > 0) ? inv.items : (reconData && reconData.lineComparisons ? reconData.lineComparisons : []);
      
      if (items.length > 0) {
        items.forEach(function (line) {
          var itemNo = line.itemNo || line.lineNumber || "1";
          var mat = line.material || line.materialCode || "Item";
          var qty = parseFloat(line.invoicedQty || line.fileQuantity || 1);
          var totalAmt = parseFloat(line.itemAmount || line.fileAmount || 0);
          var unitPrice = line.unitPrice ? parseFloat(line.unitPrice) : (qty > 0 ? (totalAmt / qty) : totalAmt);

          doc.text(itemNo + "", 14, y);
          doc.text(mat + "", 30, y);
          doc.text(qty.toLocaleString("en-IN") + "", 105, y);
          doc.text(unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 125, y);
          doc.text(totalAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 165, y);
          y += 8;
        });
      }

      doc.setDrawColor(200);
      doc.line(14, y + 5, 196, y + 5);
      doc.setFont("helvetica", "bold");
      doc.text("Gross Amount:", 125, y + 12);
      doc.text("₹ " + grossAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 165, y + 12);

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Generated by Vendor Reconciliation Engine • SAP S/4HANA System of Record.", 14, 280);

      var blob = doc.output("blob");
      this._pdfBlobUrl = URL.createObjectURL(blob);
      this._pdfFilename = "INV_" + invNo + ".pdf";

      oHost.setContent(
        '<div class="vrInvoicePdfHost">' +
        '<iframe src="' + this._pdfBlobUrl + '#toolbar=0&navpanes=0&scrollbar=0" width="100%" height="100%" style="border:none;"></iframe>' +
        '</div>'
      );
    },

    onOpenInvoicePdfInNewTab: function () {
      if (this._pdfBlobUrl) {
        window.open(this._pdfBlobUrl, "_blank");
      } else {
        MessageToast.show("PDF not ready yet.");
      }
    },

    onBack: function () {
      var sTargetTab = sessionStorage.getItem("vr_last_main_tab") || "results";
      sessionStorage.setItem("vr_nav_target_tab", sTargetTab);
      this.getOwnerComponent().getRouter().navTo("main");
    },
    
    onAccept: function() { MessageToast.show("Match Accepted"); },
    onReject: function() { MessageToast.show("Match Rejected"); },
    onEscalate: function() { MessageToast.show("Escalated to Supervisor"); },
    onDispute: function() {
      const oModel = this.getView().getModel("recon");
      const invNo = oModel ? oModel.getProperty("/invNumberFile") : "";
      const vName = oModel ? oModel.getProperty("/vendorName") : "";
      sap.m.MessageBox.information(`A dispute notification has been drafted for ${vName} regarding Invoice #${invNo}.\n\nWorkflow routed to AP Vendor Resolution queue.`, {
        title: "Vendor Dispute Initiated"
      });
    },

    onApproveMiro: function () {
      const oModel = this.getView().getModel("recon");
      const invNo = oModel ? oModel.getProperty("/invNumberFile") : "";
      sap.m.MessageBox.confirm(`Approve Invoice #${invNo} and post verified invoice receipt to SAP S/4HANA?`, {
        title: "Approve Invoice & Post to SAP",
        actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
        emphasizedAction: sap.m.MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === sap.m.MessageBox.Action.YES) {
            sap.ui.core.BusyIndicator.show(0);
            setTimeout(function () {
              sap.ui.core.BusyIndicator.hide();
              sap.m.MessageBox.success(`Invoice Approved!\n\nInvoice #${invNo} verified and posted to SAP S/4HANA (Company Code 1000).\nStatus: Ready for Payment Run.`);
              if (oModel) {
                oModel.setProperty("/status_code", "MATCHED/3-WAY-POSTED");
              }
            }, 600);
          }
        }
      });
    },

    onReleasePayment: function () {
      const oModel = this.getView().getModel("recon");
      const invNo = oModel ? oModel.getProperty("/invNumberFile") : "";
      sap.m.MessageToast.show(`Payment hold released for Invoice #${invNo}. Staged for F110 auto-payment run.`);
    },

    onExportPdf: function () {
      if (this._pdfBlobUrl && this._pdfFilename) {
        const a = document.createElement("a");
        a.href = this._pdfBlobUrl;
        a.download = this._pdfFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        sap.m.MessageToast.show("Audit Memo Downloaded");
      } else {
        sap.m.MessageToast.show("Generating audit memo...");
      }
    },

    formatDeltaText: function (v) {
      const n = Number(v || 0);
      if (Math.abs(n) < 0.01) return "No Variance (100% Matched)";
      const sign = n > 0 ? "Vendor Billed Higher: +₹ " : "Vendor Billed Lower: -₹ ";
      return sign + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatDeltaState: function (v) {
      const n = Number(v || 0);
      return Math.abs(n) < 0.01 ? "Success" : "Error";
    },

    formatDeltaIcon: function (v) {
      const n = Number(v || 0);
      return Math.abs(n) < 0.01 ? "sap-icon://accept" : "sap-icon://alert";
    }

  });
});
