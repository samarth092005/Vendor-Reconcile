import re

with open("sam6oct_main.js", "r", encoding="utf-16") as f:
    sam_code = f.read()

def extract_func(name):
    start = sam_code.find(name + ": function")
    if start == -1: return ""
    
    # Simple bracket counting to extract the whole function
    idx = sam_code.find("{", start)
    if idx == -1: return ""
    count = 1
    idx += 1
    while count > 0 and idx < len(sam_code):
        if sam_code[idx] == '{': count += 1
        elif sam_code[idx] == '}': count -= 1
        idx += 1
    
    return sam_code[start:idx] + ","

funcs_to_extract = ["_fileToBase64", "formatFallback", "onCloseDialog", "onInvoicePress", "onMiroPress", "onCloseMiroDialog"]

blocks = ""
for f in funcs_to_extract:
    blocks += "        " + extract_func(f) + "\n\n"

with open("app/vendordoclines/webapp/controller/Main.controller.js", "r", encoding="utf-8") as f:
    my_code = f.read()

target = my_code.find("formatDate: function")
new_code = my_code[:target] + blocks + my_code[target:]

with open("app/vendordoclines/webapp/controller/Main.controller.js", "w", encoding="utf-8") as f:
    f.write(new_code)
print("Injected all missing functions!")
