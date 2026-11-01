const fs = require('fs');
let content = `sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/MessageToast", "sap/m/MessageBox"], function (Controller, MessageToast, MessageBox) {
  return Controller.extend("vendordoclines.controller.Main", {
    onInit: function () {
      this._initOcrModel && this._initOcrModel();
      const router = this.getOwnerComponent().getRouter();
      router.getRoute("main").attachPatternMatched(this._onObjectMatched, this);
      router.getRoute("objectPage")?.attachPatternMatched(this._onObjectMatchedObjectPage, this);
      router.getRoute("grObjectPage")?.attachPatternMatched(this._onObjectMatchedGRObjectPage, this);
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
      
      // Ensure menu is populated
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
          this.byId("sideNavigation").setSelectedKey("results"); // highlight results since object page belongs there
      } else {
          this.byId("sideNavigation").setSelectedKey("results"); // highlight results
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
      
      const role = (user.businessRole || '').toUpperCase();
      
      // Admin should only see the AP tabs
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

      let defaultKey = navItems.length > 0 ? navItems[0].key : "intake";
      this.byId("sideNavigation").setSelectedKey(defaultKey);
      this.byId("pageContainer").to(this.createId(defaultKey));
      
    },
    formatDate: function (sDate) {
      if (!sDate) return "—";
      try {
        return new Date(sDate).toLocaleDateString();
`
let origContent = fs.readFileSync('app/vendordoclines/webapp/controller/Main.controller.js', 'utf8');
let tail = origContent.substring(origContent.indexOf('      } catch (e) {\n        return "—";\n      }'));
fs.writeFileSync('app/vendordoclines/webapp/controller/Main.controller.js', content + tail, 'utf8');
console.log("Main.controller.js resolved!");
