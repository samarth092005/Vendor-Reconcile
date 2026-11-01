sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend("vendordoclines.controller.Landing", {
    onInit: function () {
      const oRouter = this.getOwnerComponent().getRouter();

      this._onMessageHandler = function (event) {
        if (event.data && event.data.action === "reconly_navigate") {
          const target = event.data.target || "login";
          oRouter.navTo(target);
        }
      };
      window.addEventListener("message", this._onMessageHandler);
    },

    onExit: function () {
      if (this._onMessageHandler) {
        window.removeEventListener("message", this._onMessageHandler);
      }
    }
  });
});
