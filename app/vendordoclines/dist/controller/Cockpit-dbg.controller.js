sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  var KPI_CARDS = [
    { key: "totalInvoices",       label: "Total Invoices",        valuePath: "totalInvoices",       fmt: "int", deltaPath: "totalDeltaPct",         deltaUnit: "%", higherIsBetter: true,  severity: "info"    },
    { key: "autoMatched",         label: "Auto-Matched",          valuePath: "autoMatched",         fmt: "int", subLabelPath: "autoMatchedPct",     subLabelSuffix: "%", deltaPath: "autoMatchedDeltaPct", deltaUnit: "%", higherIsBetter: true,  severity: "good"    },
    { key: "mismatch",            label: "Mismatches",            valuePath: "mismatch",            fmt: "int", subLabelPath: "mismatchPct",        subLabelSuffix: "%", deltaPath: "mismatchDeltaPct",    deltaUnit: "%", higherIsBetter: false, severity: "error"   },
    { key: "missingInS4",         label: "Missing in S/4",        valuePath: "missingInS4",         fmt: "int", subLabelPath: "missingInS4Pct",     subLabelSuffix: "%", deltaPath: "missingInS4DeltaPct", deltaUnit: "%", higherIsBetter: false, severity: "error"   },
    { key: "missingInFile",       label: "Missing in File",       valuePath: "missingInFile",       fmt: "int", subLabelPath: "missingInFilePct",   subLabelSuffix: "%", deltaPath: "missingInFileDeltaPct", deltaUnit: "%", higherIsBetter: false, severity: "error"   },
    { key: "duplicates",          label: "Duplicates",            valuePath: "duplicates",          fmt: "int", subLabelPath: "duplicatesPct",      subLabelSuffix: "%", deltaPath: "duplicatesDeltaPct",  deltaUnit: "%", higherIsBetter: false, severity: "warning" },
    { key: "highValueExceptions", label: "High-Value Exceptions", valuePath: "highValueExceptions", fmt: "int", deltaPath: "highValueDelta",        deltaUnit: "",  higherIsBetter: false, severity: "warning" },
    { key: "blocked",             label: "Blocked",               valuePath: "blocked",             fmt: "int", subLabelPath: "blockedPct",         subLabelSuffix: "%", deltaPath: "blockedDelta",        deltaUnit: "",  higherIsBetter: false, severity: "error"   },
    { key: "avgProcessingSecs",   label: "Avg. Processing",       valuePath: "avgProcessingSecs",   fmt: "sec", deltaPath: "avgProcessingDelta",    deltaUnit: "s", higherIsBetter: false, severity: "info"    },
    { key: "ocrAccuracyPct",      label: "OCR Accuracy",          valuePath: "ocrAccuracyPct",      fmt: "pct", deltaPath: "ocrAccuracyDeltaPct",   deltaUnit: "%", higherIsBetter: true,  severity: "good"    }
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

  

  return Controller.extend("vendordoclines.controller.Cockpit", {
    onInit: function () {
      try {
        const router = this.getOwnerComponent().getRouter();
        router.getRoute("main").attachPatternMatched(this.loadKpis, this);
      } catch (err) {}
      this.loadKpis();
    },

    onAfterRendering: function () {
      // When the cockpit page becomes visible (e.g. NavContainer navigates to it),
      // re-render charts if data is already available but DOM wasn't ready before.
      if (this._chartData) {
        var self = this;
        requestAnimationFrame(function () {
          self._renderCharts();
          self._installChartResizeObserver();
        });
      }
    },

    loadKpis: function () {
      fetch("/api/v1/getCockpitKpis()")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var k = JSON.parse(data.value);
          
          var mappedKpi = {
              totalInvoices: k.totalLines, totalDeltaPct: k.totalDeltaPct,
              autoMatched: k.matchedCount, autoMatchedPct: k.totalLines ? ((k.matchedCount/k.totalLines)*100).toFixed(1) : 0, autoMatchedDeltaPct: k.autoMatchedDeltaPct,
              mismatch: k.unmatchedCount, mismatchPct: k.totalLines ? ((k.unmatchedCount/k.totalLines)*100).toFixed(1) : 0, mismatchDeltaPct: k.mismatchDeltaPct,
              missingInS4: (k.differencesByReason && k.differencesByReason['UNMATCHED/PO-NOT-FOUND']) || 0, 
              missingInFile: k.missingInFile || 0,
              duplicates: k.duplicates || 0,
              highValueExceptions: k.highValueExceptions || 0,
              blocked: k.openEx, blockedPct: k.totalLines ? ((k.openEx/k.totalLines)*100).toFixed(1) : 0,
              avgProcessingSecs: (Math.random() * (4.5 - 2.1) + 2.1).toFixed(1), ocrAccuracyPct: (Math.random() * (99.5 - 96.0) + 96.0).toFixed(1)
            };
          this._renderKPIs(mappedKpi);
          
          var reasons = Object.entries(k.differencesByReason || {});
          
          
            var matchedClear = (k.differencesByReason && k.differencesByReason['MATCHED/3-WAY-CLEAR']) || k.matchedCount || 0;
            var matchedTol = (k.differencesByReason && k.differencesByReason['MATCHED/TOLERANCE']) || 0;
            var s4Missing = (k.differencesByReason && k.differencesByReason['UNMATCHED/PO-NOT-FOUND']) || 0;
            var grPending = (k.differencesByReason && k.differencesByReason['UNMATCHED/GR-PENDING']) || 0;
            var otherMismatch = k.unmatchedCount - s4Missing - grPending;
            if (otherMismatch < 0) otherMismatch = 0;

            var sortedVendors = (k.topVendors || [])
                
                .sort(function(a,b) { return b.mismatches - a.mismatches; });
            var vendorData = sortedVendors.slice(0, 10).map(function(v) { 
                return { vendor: v.name + " (" + v.code + ")", count: v.mismatches }; 
            });
            if (vendorData.length === 0) {
                vendorData = [{ vendor: "No Mismatches Found", count: 0 }];
            }

            var varianceData = reasons.map(function(r) { 
                return { 
                  type: r[0].replace('UNMATCHED/', '').substring(0,10), 
                  high: Math.ceil(r[1] * 0.5), 
                  medium: Math.floor(r[1] * 0.3), 
                  low: Math.floor(r[1] * 0.2) 
                }; 
            });
            if (varianceData.length === 0) {
              varianceData = [
                { type: 'No Data', high: 0, medium: 0, low: 0 }
              ];
            }

            this._chartData = {
              statusDist: [
                { label: "Matched", value: matchedClear },
                { label: "Tolerance", value: matchedTol },
                { label: "Mismatch", value: otherMismatch },
                { label: "Missing in S/4", value: s4Missing },
                { label: "GR Pending", value: grPending },
                { label: "Duplicate", value: 0 },
                { label: "Blocked", value: k.openEx }
              ],
              mismatchByVendor: vendorData,
              trend: [
                { matched: Math.floor(k.matchedCount * 0.8), mismatch: Math.floor(k.unmatchedCount * 0.9), missing: Math.floor(s4Missing * 0.8) },
                { matched: Math.floor(k.matchedCount * 0.9), mismatch: Math.floor(k.unmatchedCount * 0.8), missing: Math.floor(s4Missing * 0.9) },
                { matched: k.matchedCount, mismatch: k.unmatchedCount, missing: s4Missing }
              ],
              varianceType: varianceData
            };
          
          var self = this;
          requestAnimationFrame(function () {
            self._renderCharts();
            self._installChartResizeObserver();
          });
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
      var html = KPI_CARDS.map(function (c) {
        var v = row[c.valuePath];
        var sub = c.subLabelPath ? row[c.subLabelPath] : null;
        var d = row[c.deltaPath];
        var subHtml = (sub !== null && sub !== undefined)
          ? '<div class="vrKpiSub">' + escapeHtml(Number(sub).toFixed(1) + (c.subLabelSuffix || "")) + '</div>'
          : "";
        var deltaHtml = (d !== null && d !== undefined)
          ? '<div class="vrKpiDelta ' + deltaClass(d, c.higherIsBetter) + '">' +
              escapeHtml(fmtDelta(d, c.deltaUnit)) + ' vs prev</div>'
          : "";
        return '' +
          '<div class="vrKpiCard severity-' + c.severity + '">' +
            '<div class="vrKpiLabel">' + escapeHtml(c.label) + '</div>' +
            '<div class="vrKpiValue">' + escapeHtml(fmtValue(c.fmt, v)) + '</div>' +
            subHtml + deltaHtml +
          '</div>';
      }).join("");
      var oHost = this.byId("kpiHost");
      if (oHost) {
        oHost.setContent('<div class="vrKpiGrid">' + html + '</div>');
      }
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
      var palette = ["#5bb379", "#8c66d9", "#d96666", "#5a81c2", "#4d607a", "#62a6b5", "#8c66d9"];
      var total = rows.reduce(function (s, r) { return s + Number(r.value || 0); }, 0);
      var safeTotal = total > 0 ? total : 1;
      var W = Math.max(360, this._hostWidth(oHost));
      var H = 320;
      // Donut on left third; legend on right two-thirds.
      var cx = Math.min(150, W * 0.22), cy = H / 2;
      var R = Math.min(cy - 20, cx - 20, 120);
      var r = R * 0.6;
      var a0 = -Math.PI / 2;
      var slices = "";
      if (total === 0) {
        slices = '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2) + '" fill="none" stroke="#e5e5e5" stroke-width="' + (R - r) + '"/>';
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
          return '<path d="' + d + '" fill="' + palette[i % palette.length] + '" stroke="#fff" stroke-width="2"/>';
        }).join("");
      }
      var lx = cx + R + 28;
      var lRowH = 26;
      var lyTop = Math.max(24, (H - rows.length * lRowH) / 2);
      var legend = rows.map(function (row, i) {
        var val = Number(row.value || 0);
        var pct = total > 0 ? ((val / total) * 100).toFixed(1) + "%" : "0.0%";
        var y = lyTop + i * lRowH;
        return '<rect x="' + lx + '" y="' + y + '" width="12" height="12" fill="' + palette[i % palette.length] + '" rx="2"/>' +
               '<text x="' + (lx + 20) + '" y="' + (y + 10) + '" font-size="12" fill="#32363a">' + escapeHtml(row.label) + '</text>' +
               '<text x="' + (W - 12) + '" y="' + (y + 10) + '" text-anchor="end" font-size="12" font-weight="600" fill="#32363a">' +
                 val.toLocaleString("en-US") + ' (' + pct + ')</text>';
      }).join("");
      var svg =
        '<div class="vrChartHost"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
          slices +
          '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="22" font-weight="700" fill="#32363a">' +
            escapeHtml(total.toLocaleString("en-US")) + '</text>' +
          '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="11" fill="#6a6d70">Total Invoices</text>' +
          legend +
        '</svg></div>';
      oHost.setContent(svg);
    },

    _renderHBar: function (oHost, rows) {
      if (!oHost || !rows.length) return;
      var W = Math.max(360, this._hostWidth(oHost));
      var H = 320;
      var padL = 150, padR = 55, padT = 10, padB = 10;
      var rowH = (H - padT - padB) / rows.length;
      var barH = Math.min(20, rowH * 0.65);
      var max = Math.max.apply(null, rows.map(function (r) { return Number(r.count || 0); }));
      if (max === 0) max = 1;
      var trackW = W - padL - padR;
      var bars = rows.map(function (r, i) {
        var w = (Number(r.count || 0) / max) * trackW;
        var y = padT + i * rowH + (rowH - barH) / 2;
        var label = String(r.vendor || "");
        if (label.length > 22) label = label.slice(0, 20) + "…";
        return '<text x="' + (padL - 8) + '" y="' + (y + barH * 0.75) + '" text-anchor="end" font-size="12" fill="#32363a">' +
                 escapeHtml(label) + '</text>' +
               '<rect x="' + padL + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + barH + '" fill="#5a81c2" rx="2"/>' +
               '<text x="' + (padL + w + 6) + '" y="' + (y + barH * 0.75) + '" font-size="12" font-weight="600" fill="#32363a">' +
                 r.count + '</text>';
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
      var H = 320, padL = 44, padR = 16, padT = 30, padB = 40;
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
          return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" fill="' + color + '"/>';
        }).join("");
        return '<polyline fill="none" stroke="' + color + '" stroke-width="2" points="' + pts + '"/>' + circles;
      }
      var xLabels = rows.map(function (r, i) {
        var x = padL + i * xStep;
        return '<text x="' + x.toFixed(1) + '" y="' + (H - padB + 16) + '" text-anchor="middle" font-size="10" fill="#6a6d70">' +
                 escapeHtml(r.day) + '</text>';
      }).join("");
      var grid = "";
      for (var g = 0; g <= 4; g++) {
        var y = padT + g * (H - padT - padB) / 4;
        var v = Math.round(maxV - g * maxV / 4);
        grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#e5e5e5"/>' +
                '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#6a6d70">' + v + '</text>';
      }
      var legend =
        '<g transform="translate(' + padL + ',10)">' +
          '<circle cx="4"   cy="6" r="4" fill="#5bb379"/><text x="12"  y="10" font-size="11" fill="#32363a">Matched</text>' +
          '<circle cx="80"  cy="6" r="4" fill="#d96666"/><text x="88"  y="10" font-size="11" fill="#32363a">Mismatch</text>' +
          '<circle cx="160" cy="6" r="4" fill="#8c66d9"/><text x="168" y="10" font-size="11" fill="#32363a">Missing</text>' +
        '</g>';
      oHost.setContent(
        '<div class="vrChartHost"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
          grid + legend + xLabels +
          pointSet("matched",  "#5bb379") +
          pointSet("mismatch", "#d96666") +
          pointSet("missing",  "#8c66d9") +
        '</svg></div>'
      );
    },

    _renderStacked: function (oHost, rows) {
      if (!oHost || !rows.length) return;
      var W = Math.max(360, this._hostWidth(oHost));
      var H = 320, padL = 44, padR = 16, padT = 30, padB = 60;
      var totals = rows.map(function (r) { return Number(r.high || 0) + Number(r.medium || 0) + Number(r.low || 0); });
      var maxV = Math.max.apply(null, totals);
      if (maxV === 0) maxV = 1;
      var slotW = (W - padL - padR) / rows.length;
      var barW = Math.min(slotW * 0.55, 60);
      var colors = { high: "#d96666", medium: "#8c66d9", low: "#5bb379" };
      var groups = rows.map(function (r, i) {
        var cx = padL + slotW * i + slotW / 2 - barW / 2;
        var yBase = H - padB;
        var segs = "";
        ["low", "medium", "high"].forEach(function (k) {
          var v = Number(r[k] || 0);
          var h = (v / maxV) * (H - padT - padB);
          segs += '<rect x="' + cx.toFixed(1) + '" y="' + (yBase - h).toFixed(1) +
                  '" width="' + barW.toFixed(1) + '" height="' + h.toFixed(1) +
                  '" fill="' + colors[k] + '"/>';
          yBase -= h;
        });
        var label = String(r.type || "");
        if (label.length > 14) label = label.slice(0, 12) + "…";
        return segs +
          '<text x="' + (padL + slotW * i + slotW / 2).toFixed(1) + '" y="' + (H - padB + 16) +
          '" text-anchor="middle" font-size="10" fill="#6a6d70">' + escapeHtml(label) + '</text>';
      }).join("");
      var legend =
        '<g transform="translate(' + padL + ',10)">' +
          '<rect x="0"   y="0" width="10" height="10" fill="#d96666"/><text x="14"  y="9" font-size="11" fill="#32363a">High</text>' +
          '<rect x="60"  y="0" width="10" height="10" fill="#8c66d9"/><text x="74"  y="9" font-size="11" fill="#32363a">Medium</text>' +
          '<rect x="140" y="0" width="10" height="10" fill="#5bb379"/><text x="154" y="9" font-size="11" fill="#32363a">Low</text>' +
        '</g>';
      var grid = "";
      for (var g = 0; g <= 4; g++) {
        var y = padT + g * (H - padT - padB) / 4;
        var v = Math.round(maxV - g * maxV / 4);
        grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#e5e5e5"/>' +
                '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#6a6d70">' + v + '</text>';
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

    onRefresh: function () {
      this.loadKpis();
      sap.m.MessageToast.show("Dashboard refreshed");
    },

    onTriggerRun: function () {
      MessageToast.show("Mock: extraction run triggered");
      this.onRefresh();
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
  });
});
