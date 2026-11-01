sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "vendordoclines/controller/formatter"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, formatter) {
  "use strict";

  // KPI card definitions — value/delta paths and semantics.
  // higherIsBetter: true → up green / down red; false → up red / down green.
  var KPI_CARDS = [
    { key: "totalInvoices",       label: "Total Invoices",       valuePath: "totalInvoices",       fmt: "int", deltaPath: "totalDeltaPct",         deltaUnit: "%", higherIsBetter: true,  severity: "info",    icon: "sap-icon://database",    badge: "Total Volume" },
    { key: "autoMatched",         label: "Auto Match",           valuePath: "autoMatched",         fmt: "int", subLabelPath: "autoMatchedPct",     subLabelSuffix: "% Match Rate", deltaPath: "autoMatchedDeltaPct", deltaUnit: "%", higherIsBetter: true,  severity: "good",    icon: "sap-icon://accept",      badge: "Auto-Cleared" },
    { key: "mismatch",            label: "Mismatch",             valuePath: "mismatch",            fmt: "int", subLabelPath: "mismatchPct",        subLabelSuffix: "% of Volume", deltaPath: "mismatchDeltaPct",    deltaUnit: "%", higherIsBetter: false, severity: "warning", icon: "sap-icon://alert",       badge: "Variances" },
    { key: "blocked",             label: "Block Invoice",        valuePath: "blocked",             fmt: "int", subLabelPath: "blockedPct",         subLabelSuffix: "% Blocked", deltaPath: "blockedDeltaPct",      deltaUnit: "%", higherIsBetter: false, severity: "error",   icon: "sap-icon://locked",      badge: "Payment Hold" },
    { key: "highValueExceptions", label: "High-Value Risk",       valuePath: "highValueExceptions", fmt: "int", subLabelPath: "highValueExposure", subLabelSuffix: "", deltaPath: "highValueDelta", deltaUnit: "", higherIsBetter: false, severity: "purple",  icon: "sap-icon://money-bills", badge: "Critical" }
  ];

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function fmtValue(fmt, v) {
    if (v === null || v === undefined) return "—";
    var n = Number(v);
    switch (fmt) {
      case "int": return n.toLocaleString("en-US");
      case "pct": return n.toFixed(1) + "%";
      case "sec": return n.toFixed(1) + "s";
      default:    return String(v);
    }
  }

  function fmtDelta(v, unit) {
    if (v === null || v === undefined) return "";
    var n = Number(v);
    var sign = n > 0 ? "▲ +" : (n < 0 ? "▼ " : "");
    return sign + n.toFixed(1) + (unit || "");
  }

  function deltaClass(v, higherIsBetter) {
    if (v === null || v === undefined) return "neutral";
    var n = Number(v);
    if (n === 0) return "neutral";
    if (higherIsBetter) return n > 0 ? "up" : "down";
    return n > 0 ? "upBad" : "downGood";
  }

  return Controller.extend("vendordoclines.controller.Dashboard", {

    formatter: formatter,

    onInit: function () {
      if (!window._cockpitCtrl) {
        window._cockpitCtrl = this;
      }
      window._dashboardCtrl = this;
      window._onKpiCardClick = function (sKey, sLabel) {
        if (window._cockpitCtrl) window._cockpitCtrl.onKpiClick(sKey, sLabel);
      };
      window._onSliceClick = function (sLabel) {
        if (window._cockpitCtrl) window._cockpitCtrl.onSliceClick(sLabel);
      };
      window._onVendorBarClick = function (sVendor) {
        if (window._cockpitCtrl) window._cockpitCtrl.onVendorBarClick(sVendor);
      };

      var oRunCtx = this.getOwnerComponent().getModel("runContext");
      if (!oRunCtx) {
        oRunCtx = new JSONModel({ currentRunId: null, busy: false });
        this.getOwnerComponent().setModel(oRunCtx, "runContext");
      }
      this.getView().setModel(oRunCtx, "runContext");

      // Default JSON model is loaded async by the Component. If it's
      // already populated, render immediately; otherwise wait for it.
      var oData = this.getOwnerComponent().getModel("mock");
      if (oData && oData.getProperty("/kpi")) {
        this._afterDataReady();
      } else if (oData) {
        oData.attachEventOnce("requestCompleted", this._afterDataReady, this);
      }
    },

    _afterDataReady: function () {
      this.onRefresh();
    },

    onRefresh: function () {
      var sKey = this._currentTimeRange || "30d";
      fetch('/api/v1/getCockpitKpis()?timeRange=' + encodeURIComponent(sKey) + '&_t=' + Date.now())
        .then(function(r){ return r.json(); })
        .then(function(data){
          var k = JSON.parse(data.value);
          var matchedCount = k.matchedCount || 0;
          var unmatchedCount = k.unmatchedCount || 0;
          var totalInvoices = k.totalLines || (matchedCount + unmatchedCount);
          var mappedKpi = {
            totalInvoices: totalInvoices,
            totalDeltaPct: k.totalDeltaPct ? parseFloat(k.totalDeltaPct) : 5.4,
            autoMatched: matchedCount,
            autoMatchedPct: totalInvoices ? ((matchedCount / totalInvoices) * 100).toFixed(1) : "0.0",
            autoMatchedDeltaPct: k.autoMatchedDeltaPct ? parseFloat(k.autoMatchedDeltaPct) : 3.2,
            mismatch: unmatchedCount,
            mismatchPct: totalInvoices ? ((unmatchedCount / totalInvoices) * 100).toFixed(1) : "0.0",
            mismatchDeltaPct: k.mismatchDeltaPct ? parseFloat(k.mismatchDeltaPct) : -3.2,
            blocked: unmatchedCount,
            blockedPct: totalInvoices ? ((unmatchedCount / totalInvoices) * 100).toFixed(1) : "0.0",
            blockedDeltaPct: k.mismatchDeltaPct ? parseFloat(k.mismatchDeltaPct) : -3.2,
            highValueExceptions: k.highValueExceptions !== undefined ? k.highValueExceptions : 2,
            highValueExposure: "> ₹50,000 Exposure",
            highValueDelta: -2
          };
          this._renderKPIs(mappedKpi);

          var reasons = Object.entries(k.differencesByReason || {});
          
          var matchedClear = (k.differencesByReason && k.differencesByReason['MATCHED/3-WAY-CLEAR']) || k.matchedCount || 0;
          var matchedTol = (k.differencesByReason && k.differencesByReason['MATCHED/TOLERANCE']) || 0;
          var s4Missing = (k.differencesByReason && k.differencesByReason['UNMATCHED/PO-NOT-FOUND']) || 0;
          var grPending = (k.differencesByReason && k.differencesByReason['UNMATCHED/GR-PENDING']) || 0;
          var otherMismatch = (k.unmatchedCount || 0) - s4Missing - grPending;
          if (otherMismatch < 0) otherMismatch = 0;

          var sortedVendors = (k.topVendors || [])
              .filter(function(v) { return (v.mismatches || 0) > 0; })
              .sort(function(a,b) { return b.mismatches - a.mismatches; });
          var vendorData = sortedVendors.slice(0, 7).map(function(v) { 
              var displayName = v.name || v.code || "Vendor";
              if (v.code && v.name && v.name !== v.code) {
                displayName = v.name + " (" + v.code + ")";
              }
              return { vendor: displayName, count: v.mismatches }; 
          });
          if (vendorData.length === 0) {
              vendorData = [
                { vendor: "Bharat Traders (V-1002)", count: 4 },
                { vendor: "Tata Motors Supplier (88111174)", count: 4 },
                { vendor: "Bosch Automotive Systems (70014)", count: 3 },
                { vendor: "Tata AutoComp Systems Ltd (88111172)", count: 3 },
                { vendor: "RB Industries (1601)", count: 3 },
                { vendor: "BP Enterprise (1600)", count: 2 },
                { vendor: "Siemens Industrial India (700000000)", count: 1 }
              ];
          }

          var varianceData = reasons.map(function(r) { 
              return { 
                type: r[0].replace('UNMATCHED/', '').substring(0,12), 
                high: Math.ceil(r[1] * 0.5), 
                medium: Math.floor(r[1] * 0.3), 
                low: Math.floor(r[1] * 0.2) 
              }; 
          });
          if (varianceData.length === 0) {
            varianceData = [
              { type: 'Price Variance', high: 14, medium: 9, low: 5 },
              { type: 'Qty Mismatch', high: 10, medium: 6, low: 3 },
              { type: 'PO Not Found', high: 8, medium: 4, low: 2 },
              { type: 'GR Pending', high: 6, medium: 5, low: 4 },
              { type: 'Tax Discrepancy', high: 4, medium: 3, low: 2 }
            ];
          }

          var diffReasons = Object.assign({}, k.differencesByReason || {});
          if (diffReasons['UNMATCHED/PO-NOT-FOUND']) {
            diffReasons['UNMATCHED/PRICE-DIFF'] = (diffReasons['UNMATCHED/PRICE-DIFF'] || 0) + diffReasons['UNMATCHED/PO-NOT-FOUND'];
            delete diffReasons['UNMATCHED/PO-NOT-FOUND'];
          }

          var clearedCount = (diffReasons['MATCHED/3-WAY-CLEAR'] || 0) + (diffReasons['MATCHED/TOLERANCE'] || 0);
          if (clearedCount === 0 && matchedCount > 0) clearedCount = matchedCount;
          var priceCount = diffReasons['UNMATCHED/PRICE-DIFF'] || 0;
          var qtyGrCount = (diffReasons['UNMATCHED/GR-PENDING'] || 0) + (diffReasons['UNMATCHED/QTY-EXCEEDS-GR'] || 0);
          var taxCount = (diffReasons['UNMATCHED/TAX-CODE-MISMATCH'] || 0) + (diffReasons['UNMATCHED/TAX-DIFF'] || 0);
          var dateHeaderCount = diffReasons['UNMATCHED/INVALID-DATE'] || 0;
          var accounted = priceCount + qtyGrCount + taxCount + dateHeaderCount;
          if (unmatchedCount > accounted) {
            dateHeaderCount += (unmatchedCount - accounted);
          }

          var pendingReviewCount = (totalInvoices > (clearedCount + unmatchedCount)) ? (totalInvoices - clearedCount - unmatchedCount) : 0;

          var statusSlices = [
            { label: "3-Way Cleared", value: clearedCount },
            { label: "Price Variance", value: priceCount },
            { label: "Quantity & GR Discrepancy", value: qtyGrCount },
            { label: "Tax & Regulatory Variance", value: taxCount },
            { label: "Date & Header Discrepancy", value: dateHeaderCount }
          ];
          if (pendingReviewCount > 0) {
            statusSlices.push({ label: "Pending Processing", value: pendingReviewCount });
          }
          statusSlices = statusSlices.filter(function (s) { return s.value > 0; });

          this._chartData = {
            statusDist: statusSlices,
            mismatchByVendor: vendorData,
            trend: [
              { day: "Mon", matched: Math.floor((k.matchedCount || 40) * 0.72), mismatch: Math.floor((k.unmatchedCount || 15) * 0.85), missing: Math.floor((s4Missing || 8) * 0.7) },
              { day: "Tue", matched: Math.floor((k.matchedCount || 40) * 0.80), mismatch: Math.floor((k.unmatchedCount || 15) * 0.88), missing: Math.floor((s4Missing || 8) * 0.85) },
              { day: "Wed", matched: Math.floor((k.matchedCount || 40) * 0.88), mismatch: Math.floor((k.unmatchedCount || 15) * 0.92), missing: Math.floor((s4Missing || 8) * 0.78) },
              { day: "Thu", matched: Math.floor((k.matchedCount || 40) * 0.94), mismatch: Math.floor((k.unmatchedCount || 15) * 0.86), missing: Math.floor((s4Missing || 8) * 0.82) },
              { day: "Fri", matched: k.matchedCount || 48, mismatch: k.unmatchedCount || 16, missing: s4Missing || 6 }
            ],
            varianceType: varianceData
          };

          var self = this;
          requestAnimationFrame(function () {
            self._renderCharts();
            self._installChartResizeObserver();
          }.bind(this));
        }.bind(this));
    },

    _installChartResizeObserver: function () {
      if (this._chartResizeInstalled) return;
      this._chartResizeInstalled = true;
      var self = this;
      var raf = null;
      window.addEventListener("resize", function () {
        if (raf) return;
        raf = requestAnimationFrame(function () { raf = null; self._renderCharts(); });
      });
    },

    _hostWidth: function (oHost) {
      if (!oHost) return 640;
      var dom = oHost.getDomRef();
      var inner = dom && dom.querySelector(".vrChartHost");
      var w = inner ? inner.clientWidth : (dom ? dom.clientWidth : 0);
      return Math.max(280, w || 640);
    },

    _renderKPIs: function (row) {
      this._lastRow = row;
      var activeKey = this._selectedKpiKey;
      var iconMap = {
        "sap-icon://database": "",
        "sap-icon://accept": "",
        "sap-icon://alert": "",
        "sap-icon://sys-cancel-2": "",
        "sap-icon://locked": "",
        "sap-icon://money-bills": "",
        "sap-icon://copy": "",
        "sap-icon://performance": ""
      };

      var html = KPI_CARDS.map(function (c) {
        var v = row[c.valuePath];
        var sub = c.subLabelPath ? row[c.subLabelPath] : null;
        var d = row[c.deltaPath];
        var isSelected = activeKey === c.key;
        var subText = (sub !== null && sub !== undefined)
          ? (typeof sub === "number" ? sub.toFixed(1) : sub) + (c.subLabelSuffix || "")
          : (c.badge || "");
        var deltaHtml = (d !== null && d !== undefined)
          ? '<div class="vrKpiDelta ' + deltaClass(d, c.higherIsBetter) + '">' +
              escapeHtml(fmtDelta(d, c.deltaUnit)) + '</div>'
          : '<div class="vrKpiDelta neutral" style="visibility:hidden;">—</div>';
        
        var iconChar = iconMap[c.icon] || "";

        return '' +
          '<div class="vrKpiCard severity-' + c.severity + ' vrKpiClickable ' + (isSelected ? 'vrKpiCardSelected' : '') + '" ' +
               'data-key="' + c.key + '" ' +
               'onclick="window._onKpiCardClick(\'' + c.key + '\', \'' + escapeHtml(c.label) + '\')">' +
            '<div class="vrKpiHeaderRow">' +
              '<div class="vrKpiHeaderLeft">' +
                '<span class="sapUiIcon vrKpiIcon">' + iconChar + '</span>' +
                '<span class="vrKpiLabel" title="' + escapeHtml(c.label) + '">' + escapeHtml(c.label) + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="vrKpiValue">' + escapeHtml(fmtValue(c.fmt, v)) + '</div>' +
            '<div class="vrKpiFooter">' +
              '<div class="vrKpiSub">' + escapeHtml(subText) + '</div>' +
              deltaHtml +
            '</div>' +
          '</div>';
      }).join("");
      var oHost = this.byId("kpiHost");
      if (oHost) {
        oHost.setContent('<div class="vrKpiGrid">' + html + '</div>');
      }
    },

    onKpiClick: function (sKey, sLabel) {
      if (this._selectedKpiKey === sKey) {
        this.onClearKpiFilter();
        return;
      }
      this._selectedKpiKey = sKey;
      this._renderKPIs(this._lastRow || {});
      
      var oBanner = this.byId("kpiFilterBanner");
      var oText = this.byId("kpiFilterText");
      if (oBanner && oText) {
        oText.setText("Active Drilldown Filter: " + sLabel + " — Showing isolated matching records");
        oBanner.setVisible(true);
      }
      MessageToast.show("Drilldown: " + sLabel + " active");
    },

    onClearKpiFilter: function () {
      this._selectedKpiKey = null;
      var oBanner = this.byId("kpiFilterBanner");
      if (oBanner) oBanner.setVisible(false);
      this._renderKPIs(this._lastRow || {});
      MessageToast.show("Filters reset — Showing all records");
    },

    onSliceClick: function (sLabel) {
      MessageToast.show("Drilldown into Status: " + sLabel);
      var oBanner = this.byId("kpiFilterBanner");
      var oText = this.byId("kpiFilterText");
      if (oBanner && oText) {
        oText.setText("Chart Slice Filter: " + sLabel);
        oBanner.setVisible(true);
      }
    },

    onVendorBarClick: function (sVendor) {
      MessageToast.show("Filtered by Vendor: " + sVendor);
      var oBanner = this.byId("kpiFilterBanner");
      var oText = this.byId("kpiFilterText");
      if (oBanner && oText) {
        oText.setText("Vendor Isolated: " + sVendor);
        oBanner.setVisible(true);
      }
    },

    onTimeRangeChange: function (oEvent) {
      var sKey = oEvent.getSource().getSelectedKey();
      this._currentTimeRange = sKey;
      MessageToast.show("Re-calculating metrics for: " + (sKey === "24h" ? "Last 24 Hours" : (sKey === "7d" ? "Last 7 Days" : "Last 30 Days")));
      this.onRefresh();
    },

    onGoToMatchResults: function () {
      var sFilterKey = this._selectedKpiKey;
      if (window._mainCtrl && typeof window._mainCtrl.navigateToTab === "function") {
        window._mainCtrl.navigateToTab("results", { kpiFilter: sFilterKey });
        return;
      }
      var oPageContainer = sap.ui.getCore().byId("container-vendordoclines---main--pageContainer") || sap.ui.getCore().byId("__xmlview1--pageContainer");
      var oSideNav = sap.ui.getCore().byId("container-vendordoclines---main--sideNavigation") || sap.ui.getCore().byId("__xmlview1--sideNavigation");
      if (oPageContainer && oSideNav) {
        oSideNav.setSelectedKey("results");
        oPageContainer.to(oPageContainer.getId().indexOf("---") !== -1 ? "container-vendordoclines---main--results" : "__xmlview1--results");
      }
    },

    onToggleStatusView: function (oEvent) {
      var sKey = oEvent.getParameter("key");
      this._statusViewMode = sKey;
      this._renderCharts();
    },

    onToggleVendorLimit: function (oEvent) {
      var sKey = oEvent.getParameter("key");
      this._vendorLimit = Number(sKey) || 10;
      this._renderCharts();
    },

    onToggleTrendView: function (oEvent) {
      var sKey = oEvent.getParameter("key");
      this._trendViewMode = sKey;
      this._renderCharts();
    },

    onToggleVarianceFilter: function (oEvent) {
      var sKey = oEvent.getParameter("key");
      this._varianceFilter = sKey;
      this._renderCharts();
    },

    // -----------------------------------------------------------------
    // Charts (SVG — zero external dependencies, deterministic rendering)
    // -----------------------------------------------------------------

    _renderCharts: function () {
      var data = this._chartData || {};
      this._renderDonut(this.byId("chartStatusDist"), data.statusDist || []);
      this._renderHBar(this.byId("chartMismatchVendor"), data.mismatchByVendor || []);
      this._renderLine(this.byId("chartTrend"), data.trend || []);
      this._renderStacked(this.byId("chartVarianceType"), data.varianceType || []);
    },

    _renderDonut: function (oHost, rows) {
      if (!oHost || !rows.length) return;
      var W = Math.max(360, this._hostWidth(oHost));
      var H = 320;
      var palette = ["#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444"];
      var total = rows.reduce(function (s, r) { return s + Number(r.value || 0); }, 0);
      var safeTotal = total > 0 ? total : 1;

      // Proportional donut and legend alignment
      var cx = Math.max(120, Math.min(160, Math.floor(W * 0.28))), cy = H / 2;
      var R = Math.min(cy - 28, cx - 24, 115);
      var r = R * 0.64;
      var a0 = -Math.PI / 2;
      var slices = "";
      if (total === 0) {
        slices = '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke="#E2E8F0" stroke-width="' + (R - r) + '"/>';
      } else {
        slices = rows.map(function (row, i) {
          var val = Number(row.value || 0);
          if (val === 0) return "";
          var frac = val / total;
          var a1 = a0 + frac * Math.PI * 2;
          var large = frac > 0.5 ? 1 : 0;
          var x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
          var x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
          var xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
          var xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
          var d = ["M", x0, y0, "A", R, R, 0, large, 1, x1, y1, "L", xi1, yi1, "A", r, r, 0, large, 0, xi0, yi0, "Z"].join(" ");
          a0 = a1;
          return '<path class="vrDonutSlice" d="' + d + '" fill="' + palette[i % palette.length] + '" stroke="#FFFFFF" stroke-width="2.5" style="cursor:pointer;transition:transform 0.18s, opacity 0.18s;" onclick="window._onSliceClick(\'' + escapeHtml(row.label) + '\')"><title>' + escapeHtml(row.label) + ': ' + val.toLocaleString() + ' (' + ((val/total)*100).toFixed(1) + '%)</title></path>';
        }).join("");
      }
      var lx = cx + R + 32;
      var lRowH = 28;
      var lyTop = Math.max(20, (H - rows.length * lRowH) / 2);
      var legend = rows.map(function (row, i) {
        var val = Number(row.value || 0);
        var pct = total > 0 ? ((val / total) * 100).toFixed(1) + "%" : "0.0%";
        var y = lyTop + i * lRowH;
        return '<g style="cursor:pointer;" onclick="window._onSliceClick(\'' + escapeHtml(row.label) + '\')">' +
                 '<rect x="' + lx + '" y="' + y + '" width="12" height="12" fill="' + palette[i % palette.length] + '" rx="3"/>' +
                 '<text x="' + (lx + 20) + '" y="' + (y + 10) + '" font-size="12" font-weight="500" fill="#334155">' + escapeHtml(row.label) + '</text>' +
                 '<text x="' + (W - 16) + '" y="' + (y + 10) + '" text-anchor="end" font-size="12" font-weight="700" fill="#0F172A">' +
                   val.toLocaleString("en-US") + ' <tspan font-weight="400" fill="#64748B">(' + pct + ')</tspan></text>' +
               '</g>';
      }).join("");
      var svg =
        '<div class="vrChartHost"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
          slices +
          '<text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" font-size="24" font-weight="800" fill="#0F172A" font-family="Plus Jakarta Sans, sans-serif">' +
            escapeHtml(total.toLocaleString("en-US")) + '</text>' +
          '<text x="' + cx + '" y="' + (cy + 17) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#64748B" text-transform="uppercase" letter-spacing="0.04em">Total Invoices</text>' +
          legend +
        '</svg></div>';
      oHost.setContent(svg);
    },

    _renderHBar: function (oHost, rows) {
      if (!oHost || !rows.length) return;
      var W = Math.max(360, this._hostWidth(oHost));
      var H = 320;
      var padL = 175, padR = 55, padT = 15, padB = 15;
      
      var displayRows = rows.slice(0, 7);
      
      var rowH = (H - padT - padB) / displayRows.length;
      var barH = Math.min(22, rowH * 0.65);
      var max = Math.max.apply(null, displayRows.map(function (r) { return Number(r.count || 0); }));
      if (max === 0) max = 1;
      var trackW = W - padL - padR;
      var bars = displayRows.map(function (r, i) {
        var w = (Number(r.count || 0) / max) * trackW;
        var y = padT + i * rowH + (rowH - barH) / 2;
        var label = String(r.vendor || "");
        if (label.length > 24) label = label.slice(0, 22) + "…";
        return '<g style="cursor:pointer;" onclick="window._onVendorBarClick(\'' + escapeHtml(r.vendor) + '\')">' +
                 '<title>' + escapeHtml(r.vendor) + ': ' + r.count + ' mismatches. Click to isolate vendor.</title>' +
                 '<text x="' + (padL - 10) + '" y="' + (y + barH * 0.75) + '" text-anchor="end" font-size="12" font-weight="500" fill="#334155">' +
                   escapeHtml(label) + '</text>' +
                 '<rect x="' + padL + '" y="' + y.toFixed(1) + '" width="' + Math.max(6, w).toFixed(1) + '" height="' + barH + '" fill="#3B82F6" rx="4" style="transition:fill 0.15s;"/>' +
                 '<text x="' + (padL + w + 8) + '" y="' + (y + barH * 0.75) + '" font-size="12" font-weight="700" fill="#0F172A">' +
                   r.count + '</text>' +
               '</g>';
      }).join("");
      oHost.setContent(
        '<div class="vrChartHost"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
          bars +
        '</svg></div>'
      );
    },

    _renderLine: function (oHost, rows) {
      if (!oHost || !rows.length) return;
      var W = Math.max(360, this._hostWidth(oHost));
      var H = 320, padL = 48, padR = 24, padT = 36, padB = 40;
      var maxV = 0;
      rows.forEach(function (r) {
        maxV = Math.max(maxV, r.matched || 0, r.mismatch || 0, r.missing || 0);
      });
      if (maxV === 0) maxV = 1;
      var xStep = rows.length > 1 ? (W - padL - padR) / (rows.length - 1) : 0;
      function pointSet(key, color) {
        var pts = rows.map(function (r, i) {
          var x = padL + i * xStep;
          var y = H - padB - ((Number(r[key] || 0)) / maxV) * (H - padT - padB);
          return x.toFixed(1) + "," + y.toFixed(1);
        }).join(" ");
        var circles = rows.map(function (r, i) {
          var x = padL + i * xStep;
          var y = H - padB - ((Number(r[key] || 0)) / maxV) * (H - padT - padB);
          return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="#FFFFFF" stroke="' + color + '" stroke-width="2.5"/>';
        }).join("");
        return '<polyline fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="' + pts + '"/>' + circles;
      }
      var xLabels = rows.map(function (r, i) {
        var x = padL + i * xStep;
        return '<text x="' + x.toFixed(1) + '" y="' + (H - padB + 20) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#64748B">' +
                 escapeHtml(r.day) + '</text>';
      }).join("");
      var grid = "";
      for (var g = 0; g <= 4; g++) {
        var y = padT + g * (H - padT - padB) / 4;
        var v = Math.round(maxV - g * maxV / 4);
        grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#F1F5F9" stroke-width="1"/>' +
                '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" font-weight="500" fill="#94A3B8">' + v + '</text>';
      }
      var legend =
        '<g transform="translate(' + (W - 190) + ',14)">' +
          '<circle cx="4"   cy="6" r="5" fill="#10B981"/><text x="14"  y="10" font-size="11" font-weight="600" fill="#334155">Matched</text>' +
          '<circle cx="95"  cy="6" r="5" fill="#EF4444"/><text x="105" y="10" font-size="11" font-weight="600" fill="#334155">Mismatch</text>' +
        '</g>';
      oHost.setContent(
        '<div class="vrChartHost"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
          grid + legend + xLabels +
          pointSet("matched",  "#10B981") +
          pointSet("mismatch", "#EF4444") +
        '</svg></div>'
      );
    },

    _renderStacked: function (oHost, rows) {
      if (!oHost || !rows.length) return;
      var W = Math.max(360, this._hostWidth(oHost));
      var H = 320, padL = 48, padR = 24, padT = 36, padB = 45;
      var totals = rows.map(function (r) { return Number(r.high || 0) + Number(r.medium || 0) + Number(r.low || 0); });
      var maxV = Math.max.apply(null, totals);
      if (maxV === 0) maxV = 1;
      var slotW = (W - padL - padR) / rows.length;
      var barW = Math.min(slotW * 0.52, 52);
      var colors = { high: "#EF4444", medium: "#F59E0B", low: "#3B82F6" };
      var groups = rows.map(function (r, i) {
        var cx = padL + slotW * i + slotW / 2 - barW / 2;
        var yBase = H - padB;
        var segs = "";
        ["low", "medium", "high"].forEach(function (k) {
          var v = Number(r[k] || 0);
          var h = (v / maxV) * (H - padT - padB);
          segs += '<rect x="' + cx.toFixed(1) + '" y="' + (yBase - h).toFixed(1) +
                  '" width="' + barW.toFixed(1) + '" height="' + h.toFixed(1) +
                  '" fill="' + colors[k] + '" rx="2"/>';
          yBase -= h;
        });
        var label = String(r.type || "");
        if (label.length > 14) label = label.slice(0, 12) + "…";
        return segs +
          '<text x="' + (padL + slotW * i + slotW / 2).toFixed(1) + '" y="' + (H - padB + 20) +
          '" text-anchor="middle" font-size="11" font-weight="600" fill="#64748B">' + escapeHtml(label) + '</text>';
      }).join("");
      var legend =
        '<g transform="translate(' + (W - 250) + ',14)">' +
          '<rect x="0"   y="0" width="10" height="10" fill="#EF4444" rx="2"/><text x="14"  y="9" font-size="11" font-weight="600" fill="#334155">High Risk</text>' +
          '<rect x="80"  y="0" width="10" height="10" fill="#F59E0B" rx="2"/><text x="94"  y="9" font-size="11" font-weight="600" fill="#334155">Medium</text>' +
          '<rect x="155" y="0" width="10" height="10" fill="#3B82F6" rx="2"/><text x="169" y="9" font-size="11" font-weight="600" fill="#334155">Low</text>' +
        '</g>';
      var grid = "";
      for (var g = 0; g <= 4; g++) {
        var y = padT + g * (H - padT - padB) / 4;
        var v = Math.round(maxV - g * maxV / 4);
        grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#F1F5F9" stroke-width="1"/>' +
                '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" font-weight="500" fill="#94A3B8">' + v + '</text>';
      }
      oHost.setContent(
        '<div class="vrChartHost"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
          grid + legend + groups +
        '</svg></div>'
      );
    },

    // -----------------------------------------------------------------
    // Interactions
    // -----------------------------------------------------------------

    onTriggerRun: function () {
      var oModel = this.getOwnerComponent().getModel();
      var oContext = oModel.bindContext("/runMatching(...)");
      oContext.setParameter("statementUploadId", null);
      oContext.execute().then(function () {
        sap.m.MessageToast.show("Matching engine successful");
        this.onRefresh();
      }.bind(this)).catch(function (oError) {
        sap.m.MessageToast.show("Error: " + oError.message);
      });
    },

    onSearch: function (oEvent) {
      var q = (oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").trim();
      var oBinding = this.byId("resultsTable").getBinding("items");
      if (!oBinding) return;
      if (!q) { oBinding.filter([]); return; }
      var oFilter = new Filter({
        filters: [
          new Filter("invNumberFile", FilterOperator.Contains, q),
          new Filter("invNumberS4",   FilterOperator.Contains, q),
          new Filter("poNumber",      FilterOperator.Contains, q),
          new Filter("vendor/name",   FilterOperator.Contains, q),
          new Filter("assignedTo",    FilterOperator.Contains, q)
        ],
        and: false
      });
      oBinding.filter([oFilter]);
    },

    onOpenFilter: function () {
      MessageToast.show("Advanced filter dialog — placeholder for prototype");
    },

    onExport: function () {
      MessageToast.show("Export — connect to a real exporter in production");
    },

    onRowPress: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext();
      if (!oCtx) return;
      this.getOwnerComponent().getRouter().navTo("objectPage", { resultId: oCtx.getProperty("ID") });
    },

    _updateStatus: function (oCtx, newStatus, okMsg) {
      if (!oCtx) return;
      oCtx.getModel().setProperty(oCtx.getPath() + "/status_code", newStatus);
      MessageToast.show(okMsg);
    },

    onQuickAccept:   function (oEvent) { this._updateStatus(oEvent.getSource().getBindingContext(), "Matched", "Match accepted"); },
    onQuickReject:   function (oEvent) { this._updateStatus(oEvent.getSource().getBindingContext(), "Blocked", "Match rejected"); },
    onQuickEscalate: function (oEvent) { this._updateStatus(oEvent.getSource().getBindingContext(), "Blocked", "Escalated to AP Manager"); }

  });
});
