import re

with open("app/vendordoclines/webapp/controller/Main.controller.js", "r", encoding="utf-8") as f:
    code = f.read()

# Let's see what the restored submit block looks like
start_idx = code.find("onSubmitScannedInvoice:")
end_idx = code.find("onRunMatching:")
print(code[start_idx:end_idx])
