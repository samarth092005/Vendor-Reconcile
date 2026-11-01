sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/MessageToast"], function (Controller, MessageToast) {
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
      
      if (user.username) {
        this.getOwnerComponent().getRouter().navTo("main");
      } else {
        const lastUsername = localStorage.getItem("vr_last_username");
        if (lastUsername) {
          const usernameInput = this.byId("loginUsername");
          if (usernameInput) {
            usernameInput.setValue(lastUsername);
          }
        }
      }
    },
    
    onQuickLoginSelect: function (oEvent) {
      const selectedKey = oEvent.getParameter("selectedItem").getKey();
      if (selectedKey) {
        this.byId("loginUsername").setValue(selectedKey);
        this.byId("loginPassword").setValue("admin"); // The default password for all demo accounts is 'admin'
      } else {
        this.byId("loginUsername").setValue("");
        this.byId("loginPassword").setValue("");
      }
    },

    onLogin: function () {
      const username = this.byId("loginUsername").getValue()?.trim();
      const password = this.byId("loginPassword").getValue();
      
      if (!username || !password) {
        MessageToast.show("Please enter both username and password.");
        return;
      }
      
      fetch("/api/v1/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      }).then(r => {
        if (!r.ok) throw new Error("Invalid credentials");
        return r.json();
      }).then(data => {
        const user = JSON.parse(data.value);
        sessionStorage.setItem("vr_user", JSON.stringify(user));
        localStorage.setItem("vr_last_username", username);
        
        this.getOwnerComponent().getRouter().navTo("main");
      }).catch(e => MessageToast.show(e.message));
    },
    
    onGoRegister: function () {
      this.getOwnerComponent().getRouter().navTo("register");
    }
  });
});