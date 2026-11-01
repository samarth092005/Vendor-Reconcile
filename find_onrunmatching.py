with open("sam6oct_main.js", "r", encoding="utf-16") as f:
    sam_code = f.read()

lines = sam_code.splitlines()
for i, line in enumerate(lines):
    if "onRunMatching" in line:
        print("Found at line", i)
        for j in range(max(0, i-5), min(len(lines), i+15)):
            print(lines[j])
        break
