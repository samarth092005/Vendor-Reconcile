sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/m/MessageBox"], function (Controller, JSONModel, MessageBox) {
  const ROLE_LABELS = {
    PR:      "PR / Indenter Workbench",
    PO:      "Purchase Order Workbench",
    VENDOR:  "Vendor Portal",
    GR:      "Goods Receipt Workbench",
    FINANCE: "Finance Executive Workbench",
    AP:      "Accounts Payable Cockpit",
    BILLING: "Vendor Billing Dashboard (Legacy)",
    AR:      "AR Receivables Monitor (Legacy)"
  };
  return Controller.extend("vendordoclines.controller.Home", {
    onInit: function () {
      const user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
      if (!user.username) return this.getOwnerComponent().getRouter().navTo("login");
      const model = new JSONModel({ ...user, workbenchLabel: ROLE_LABELS[(user.businessRole || "").toUpperCase().trim()] || user.businessRole, kpis: {} });
      this.getView().setModel(model, "home");
      fetch("/api/v1/getCockpitKpis()").then(r => r.json()).then(data => {
        model.setProperty("/kpis", JSON.parse(data.value));
      });
    },
    onOpenWorkbench: function () {
      const user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
      const roleRouteMap = { 
        PR: "pr",
        PO: "po",
        VENDOR: "vendorportal",
        GR: "gr",
        FINANCE: "main",
        AP: "main",
        BILLING: "billing",
        AR: "ar"
      };
      
        let role = (user.businessRole || '').toUpperCase().trim();
        if (role === "USER" || role === "") {
            if (user.username.toLowerCase().includes("pr")) role = "PR";
            else if (user.username.toLowerCase().includes("po")) role = "PO";
            else if (user.username.toLowerCase().includes("v")) role = "VENDOR";
            else if (user.username.toLowerCase().includes("gr")) role = "GR";
            else if (user.username.toLowerCase().includes("ap")) role = "AP";
            else if (user.username.toLowerCase().includes("admin")) role = "AP";
        }

      const route = roleRouteMap[role] || "workbench";
      this.getOwnerComponent().getRouter().navTo(route);
    },
    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("login");
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