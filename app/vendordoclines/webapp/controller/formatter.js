sap.ui.define([], function () {
  "use strict";

  var STATUS_META = {
    Matched:       { state: "Success", pill: "vrPillMatched",     icon: "sap-icon://accept" },
    Tolerance:     { state: "Warning", pill: "vrPillTolerance",   icon: "sap-icon://alert" },
    Mismatch:      { state: "Error",   pill: "vrPillMismatch",    icon: "sap-icon://error" },
    MissingInS4:   { state: "Error",   pill: "vrPillMissingS4",   icon: "sap-icon://message-error" },
    MissingInFile: { state: "Error",   pill: "vrPillMissingFile", icon: "sap-icon://message-error" },
    Duplicate:     { state: "Warning", pill: "vrPillDuplicate",   icon: "sap-icon://duplicate" },
    Blocked:       { state: "Error",   pill: "vrPillBlocked",     icon: "sap-icon://locked" }
  };

  var STATUS_LABEL = {
    Matched: "Matched",
    Tolerance: "Tolerance",
    Mismatch: "Mismatch",
    MissingInS4: "Missing in S/4",
    MissingInFile: "Missing in File",
    Duplicate: "Duplicate",
    Blocked: "Blocked"
  };

  return {

    statusState: function (code) {
      if (STATUS_META[code]) return STATUS_META[code].state;
      if (!code) return "None";
      var c = String(code).toUpperCase();
      if (c.indexOf("MATCHED") !== -1 && c.indexOf("UNMATCHED") === -1) return "Success";
      if (c.indexOf("UNMATCHED") !== -1 || c.indexOf("MISMATCH") !== -1 || c.indexOf("ERROR") !== -1 || c.indexOf("DIFF") !== -1) return "Error";
      if (c.indexOf("TOLERANCE") !== -1 || c.indexOf("PENDING") !== -1 || c.indexOf("WARN") !== -1) return "Warning";
      return "None";
    },

    statusPillClass: function (code) {
      return (STATUS_META[code] || {}).pill || "";
    },

    statusIcon: function (code) {
      if (STATUS_META[code]) return STATUS_META[code].icon;
      if (!code) return "sap-icon://circle-task";
      var c = String(code).toUpperCase();
      if (c.indexOf("MATCHED") !== -1 && c.indexOf("UNMATCHED") === -1) return "sap-icon://accept";
      if (c.indexOf("UNMATCHED") !== -1 || c.indexOf("MISMATCH") !== -1 || c.indexOf("DIFF") !== -1) return "sap-icon://error";
      if (c.indexOf("TOLERANCE") !== -1 || c.indexOf("PENDING") !== -1) return "sap-icon://alert";
      return "sap-icon://circle-task";
    },

    statusLabel: function (code) {
      return STATUS_LABEL[code] || code || "";
    },

    criticalityToState: function (c) {
      switch (Number(c)) {
        case 1: return "Error";
        case 2: return "Warning";
        case 3: return "Success";
        default: return "None";
      }
    },

    // Delta formatting for KPI cards.
    // higherIsBetter = true  -> positive delta shown in green, negative in red
    // higherIsBetter = false -> negative delta shown in green, positive in red
    deltaText: function (value, unit) {
      if (value === null || value === undefined) return "";
      var v = Number(value);
      var sign = v > 0 ? "+" : (v < 0 ? "" : "");
      return sign + v.toFixed(1) + (unit || "");
    },

    deltaClass: function (value, higherIsBetter) {
      if (value === null || value === undefined) return "vrKpiDelta neutral";
      var v = Number(value);
      if (v === 0) return "vrKpiDelta neutral";
      if (higherIsBetter) {
        return "vrKpiDelta " + (v > 0 ? "up" : "down");
      }
      return "vrKpiDelta " + (v > 0 ? "upBad" : "downGood");
    },

    // Numeric formatting
    intFmt: function (v) {
      if (v === null || v === undefined) return "";
      return Number(v).toLocaleString("en-US");
    },

    pctFmt: function (v) {
      if (v === null || v === undefined) return "";
      return Number(v).toFixed(1) + "%";
    },

    secondsFmt: function (v) {
      if (v === null || v === undefined) return "";
      return Number(v).toFixed(1) + "s";
    },

    currencyFmt: function (v, cur) {
      if (v === null || v === undefined) return "₹ 0.00";
      try {
        return "₹ " + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } catch (e) {
        return "₹ " + String(v);
      }
    },

    varianceState: function (v) {
      if (v === null || v === undefined) return "None";
      var n = Number(v);
      if (Math.abs(n) < 0.01) return "Success";
      return Math.abs(n) > 100 ? "Error" : "Warning";
    },

    isMismatch: function (code) {
      return code === "Mismatch";
    },

    fmtDate: function (s) {
      if (!s) return "";
      try {
        var d = new Date(s);
        return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
      } catch (e) { return s; }
    },

    fmtDateTime: function (s) {
      if (!s) return "";
      try {
        var d = new Date(s);
        return d.toLocaleString("en-GB", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      } catch (e) { return s; }
    }
  };
});
