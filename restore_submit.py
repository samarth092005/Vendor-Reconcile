import re

with open("sam6oct_main.js", "r", encoding="utf-16") as f:
    sam_code = f.read()

start_idx = sam_code.find("onSubmitScannedInvoice:")
end_idx = sam_code.find("onRunMatching:")

if start_idx != -1 and end_idx != -1:
    submit_block = sam_code[start_idx:end_idx]
    
    # Fix the URL so it actually works on BTP without triggering the HTML 404 parse error
    submit_block = submit_block.replace('fetch("/odata/v4/reconciliation/VendorDocLines"', 'fetch("/recon/VendorDocLines"')
    submit_block = submit_block.replace('err.message.includes("fetch")', 'err.message.includes("fetch") || err.message.includes("token") || err.message.includes("JSON") || err.message.includes("Unexpected")')
    
    with open("app/vendordoclines/webapp/controller/Main.controller.js", "r", encoding="utf-8") as f:
        my_code = f.read()
    
    my_start_idx = my_code.find("onSubmitScannedInvoice:")
    my_end_idx = my_code.find("onRunMatching:")
    
    if my_start_idx != -1 and my_end_idx != -1:
        new_code = my_code[:my_start_idx] + submit_block + my_code[my_end_idx:]
        
        with open("app/vendordoclines/webapp/controller/Main.controller.js", "w", encoding="utf-8") as f:
            f.write(new_code)
        print("Restored original onSubmitScannedInvoice with comments!")
    else:
        print("Target bounds not found in my code")
else:
    print("Could not find bounds in sam6oct")
