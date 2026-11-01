import re

with open("sam6oct_main.js", "r", encoding="utf-16") as f:
    sam_code = f.read()

# find all functions defined as "xxx: function"
pattern = r"(\b\w+\b)\s*:\s*function"
matches = re.findall(pattern, sam_code)
print("Functions in sam6oct_main.js:", matches)

with open("app/vendordoclines/webapp/controller/Main.controller.js", "r", encoding="utf-8") as f:
    my_code = f.read()

my_matches = re.findall(pattern, my_code)
print("Functions in my Main.controller.js:", my_matches)

missing = set(matches) - set(my_matches)
print("MISSING FUNCTIONS:", missing)
