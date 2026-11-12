sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("vendordoclines.controller.Login", {
    onInit: function () {
      this.getOwnerComponent().getRouter().getRoute("login").attachPatternMatched(this._onObjectMatched, this);
    },

    _onObjectMatched: function () {
      let user = {};
      try {
        user = JSON.parse(sessionStorage.getItem("vr_user") || "{}");
      } catch (e) {
        sessionStorage.removeItem("vr_user");
      }

      // Always clear input cells on load
      const usernameInput = this.byId("loginUsername");
      if (usernameInput) {
        usernameInput.setValue("");
      }
      const passwordInput = this.byId("loginPassword");
      if (passwordInput) {
        passwordInput.setValue("");
      }
      localStorage.removeItem("vr_last_username");

      if (user.username) {
        this.getOwnerComponent().getRouter().navTo("main");
      }
    },

    onPersonaClick: function (oEvent) {
      const oBtn = oEvent.getSource();
      const sKey = oBtn.data("key");
      const sRole = oBtn.data("role");

      // Auto-populate inputs
      const oUser = this.byId("loginUsername");
      const oPass = this.byId("loginPassword");
      if (oUser) oUser.setValue(sKey);
      if (oPass) oPass.setValue("admin");

      // Highlight active persona button
      const aBtns = ["btnPersonaAdmin"];
      aBtns.forEach(function (id) {
        const btn = this.byId(id);
        if (btn) {
          btn.removeStyleClass("rcPersonaCardActive");
        }
      }.bind(this));
      oBtn.addStyleClass("rcPersonaCardActive");

      // Update role chip
      const oRoleBadge = this.byId("selectedRoleBadge");
      if (oRoleBadge) {
        oRoleBadge.setText("Admin");
        oRoleBadge.setVisible(true);
      }

      // Synchronize hidden/fallback select
      const oSelect = this.byId("quickLoginSelect");
      if (oSelect) {
        oSelect.setSelectedKey(sKey);
      }

      // Automatically sign in & open dashboard immediately upon persona selection
      this.onLogin();
    },

    onQuickLoginSelect: function (oEvent) {
      const selectedKey = oEvent.getParameter("selectedItem") ? oEvent.getParameter("selectedItem").getKey() : "";
      if (selectedKey) {
        this.byId("loginUsername").setValue(selectedKey);
        this.byId("loginPassword").setValue("admin");
        this.onLogin();
      } else {
        this.byId("loginUsername").setValue("");
        this.byId("loginPassword").setValue("");
      }
    },

    onLogin: function () {
      const username = this.byId("loginUsername").getValue()?.trim();
      const password = this.byId("loginPassword").getValue();
      const oLoginBtn = this.byId("btnLogin");

      if (!username || !password) {
        MessageToast.show("Please enter both username and password.");
        return;
      }

      if (oLoginBtn) {
        oLoginBtn.setBusy(true);
      }

      // Determine role based on username
      let role = "User";
      const u = username.toLowerCase();
      if (u.includes("admin") || u === "alice") {
        role = "Admin";
      } else if (u.includes("gr")) {
        role = "GR";
      } else if (u.includes("po")) {
        role = "PO";
      } else if (u.includes("pr")) {
        role = "PR";
      } else if (u.startsWith("v-") || u.includes("vendor")) {
        role = "Vendor";
      } else if (u.includes("miro")) {
        role = "MIRO";
      }

      const userObj = {
        username: username,
        businessRole: role,
        vendorCode: u.startsWith("v-") ? username : undefined
      };

      // Instantly set session storage and navigate
      try {
        sessionStorage.setItem("vr_user", JSON.stringify(userObj));
        sessionStorage.removeItem("vr_last_main_tab");
        sessionStorage.setItem("vr_nav_target_tab", "cockpit");
        localStorage.removeItem("vr_last_username");
      } catch (err) {
        console.warn("Session set warning:", err);
      }

      if (oLoginBtn) {
        oLoginBtn.setBusy(false);
      }

      // Seamless instant navigation to dashboard
      this.getOwnerComponent().getRouter().navTo("main");

      // Non-blocking background sync with backend
      fetch("/api/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password })
      }).catch(function (err) {
        console.warn("Background auth sync warning:", err);
      });
    },

    onBackToLanding: function () {
      this.getOwnerComponent().getRouter().navTo("landing");
    },

    onGoRegister: function () {
      this.getOwnerComponent().getRouter().navTo("register");
    }
  });
});
