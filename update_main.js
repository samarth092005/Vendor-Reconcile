const fs = require('fs');

// Update Main.view.xml
let viewContent = fs.readFileSync('app/vendordoclines/webapp/view/Main.view.xml', 'utf8');
viewContent = viewContent.replace(/<tnt:NavigationList>[\s\S]*?<\/tnt:NavigationList>/, `<tnt:NavigationList items="{ui>/navItems}">
          <tnt:NavigationListItem text="{ui>text}" icon="{ui>icon}" key="{ui>key}" />
        </tnt:NavigationList>`);
viewContent = viewContent.replace(/<!-- Page: Intake & Lines -->/, `<!-- Page: PR -->
        <Page id="pr" showHeader="false">
          <mvc:XMLView id="prView" viewName="vendordoclines.view.PRView"/>
        </Page>

        <!-- Page: PO -->
        <Page id="po" showHeader="false">
          <mvc:XMLView id="poView" viewName="vendordoclines.view.POView"/>
        </Page>

        <!-- Page: GR -->
        <Page id="gr" showHeader="false">
          <mvc:XMLView id="grView" viewName="vendordoclines.view.GRView"/>
        </Page>

        <!-- Page: Vendor -->
        <Page id="vendor" showHeader="false">
          <mvc:XMLView id="vendorView" viewName="vendordoclines.view.VendorView"/>
        </Page>

        <!-- Page: Intake & Lines -->`);
fs.writeFileSync('app/vendordoclines/webapp/view/Main.view.xml', viewContent);

// Update Main.controller.js
let ctrlContent = fs.readFileSync('app/vendordoclines/webapp/controller/Main.controller.js', 'utf8');
ctrlContent = ctrlContent.replace(/_onObjectMatched: function \(\) \{[\s\S]*?\},/m, `_onObjectMatched: function () {
      const user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
      if (!user.username) {
        this.getOwnerComponent().getRouter().navTo("login");
        return;
      }
      
      const role = user.businessRole || '';
      
      // Admin should only see the AP tabs
      const isAdmin = (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'AP');

      let navItems = [];
      if (role === 'PR') {
          navItems.push({ text: "Purchase Requisitions", icon: "sap-icon://cart", key: "pr" });
      } else if (role === 'PO') {
          navItems.push({ text: "Purchase Orders", icon: "sap-icon://sales-order", key: "po" });
      } else if (role === 'GR') {
          navItems.push({ text: "Goods Receipts", icon: "sap-icon://shipping-status", key: "gr" });
      } else if (role === 'VENDOR') {
          navItems.push({ text: "Vendor Portal", icon: "sap-icon://supplier", key: "vendor" });
      } else if (isAdmin || role === 'MIRO' || role === 'FINANCE') {
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
      
      // Pass role headers on OData models
      const oModel = this.getOwnerComponent().getModel();
      if (oModel && user.businessRole) {
        oModel.setHeaders({
          "x-user-role": user.businessRole,
          "x-user-vendor": user.vendorCode || ""
        });
      }
    },`);
fs.writeFileSync('app/vendordoclines/webapp/controller/Main.controller.js', ctrlContent);
console.log('Done');
