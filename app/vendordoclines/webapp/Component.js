sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
  return UIComponent.extend("vendordoclines.Component", {
    metadata: { manifest: "json" },
    init: function () {
      const self = this;

      // Sync headers on login/logout safely
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = function (key, value) {
        try {
          originalSetItem.apply(this, arguments);
        } catch (e) {
          console.warn("sessionStorage.setItem error:", e);
        }
        if (key === "vr_user") {
          try {
            const user = JSON.parse(value || "{}");
            const oModel = self.getModel();
            if (oModel && typeof oModel.changeHttpHeaders === 'function') {
              const role = ['AR', 'BILLING', 'VENDOR'].includes(user.businessRole) ? 'Vendor' : user.businessRole;
              oModel.changeHttpHeaders({
                "x-user-role": role,
                "x-user-vendor": user.vendorCode || undefined
              });
            }
          } catch (err) {
            console.warn("Header sync error on login:", err);
          }
        }
      };

      const originalRemoveItem = sessionStorage.removeItem;
      sessionStorage.removeItem = function (key) {
        try {
          originalRemoveItem.apply(this, arguments);
        } catch (e) {
          console.warn("sessionStorage.removeItem error:", e);
        }
        if (key === "vr_user") {
          try {
            const oModel = self.getModel();
            if (oModel && typeof oModel.changeHttpHeaders === 'function') {
              oModel.changeHttpHeaders({
                "x-user-role": undefined,
                "x-user-vendor": undefined
              });
            }
          } catch (err) {
            console.warn("Header clear error on logout:", err);
          }
        }
      };

      // Global fetch interceptor to append security headers for raw fetch calls
      const originalFetch = window.fetch;
      window.fetch = function (url, options) {
        if (typeof url === 'string' && url.includes('/api/v1/')) {
          options = options || {};
          options.headers = options.headers || {};
          
          const savedUser = sessionStorage.getItem("vr_user");
          if (savedUser) {
            const user = JSON.parse(savedUser);
            const role = ['AR', 'BILLING', 'VENDOR'].includes(user.businessRole) ? 'Vendor' : user.businessRole;
            
            if (typeof options.headers.set === 'function') {
              options.headers.set("x-user-role", role);
              options.headers.set("x-user-vendor", user.vendorCode || "");
            } else {
              options.headers["x-user-role"] = role;
              options.headers["x-user-vendor"] = user.vendorCode || "";
            }
          }
        }
        return originalFetch.call(this, url, options);
      };

      // (Removed localStorage auto-restore to prevent skipping login page)

      UIComponent.prototype.init.apply(this, arguments);

      // Initialize headers on page reload safely
      const sessionUser = sessionStorage.getItem("vr_user");
      if (sessionUser) {
        try {
          const user = JSON.parse(sessionUser);
          const oModel = this.getModel();
          if (oModel && typeof oModel.changeHttpHeaders === 'function') {
            const role = ['AR', 'BILLING', 'VENDOR'].includes(user.businessRole) ? 'Vendor' : user.businessRole;
            oModel.changeHttpHeaders({
              "x-user-role": role,
              "x-user-vendor": user.vendorCode || undefined
            });
          }
        } catch (err) {
          console.warn("Reload header sync warning:", err);
        }
      }

      this.getRouter().initialize();
    }
  });
});