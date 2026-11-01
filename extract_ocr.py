import re

with open("sam6oct_main.js", "r", encoding="utf-16") as f:
    sam_code = f.read()

lines = sam_code.splitlines(True)
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "onOpenOcrDialog:" in line:
        start_idx = i
    if "onSubmitScannedInvoice:" in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    ocr_block_lines = lines[start_idx:end_idx]
    print("Found OCR block, lines:", len(ocr_block_lines))
    
    with open("app/vendordoclines/webapp/controller/Main.controller.js", "r", encoding="utf-8") as f:
        my_code = f.read()
    
    my_lines = my_code.splitlines(True)
    my_start_idx = -1
    my_end_idx = -1
    for i, line in enumerate(my_lines):
        if "onOpenOcrScanner:" in line:
            my_start_idx = i
        if "onSubmitScannedInvoice:" in line:
            my_end_idx = i
            
    if my_start_idx != -1 and my_end_idx != -1:
        new_lines = my_lines[:my_start_idx] + ocr_block_lines + my_lines[my_end_idx:]
        with open("app/vendordoclines/webapp/controller/Main.controller.js", "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print("Merged successfully!")
    else:
        print("Could not find dummy bounds in my code")
else:
    print("Could not find bounds in sam6oct_main")
