import os
import re

funcs_dir = "joule_vendor_recon/vendor_recon_capability/functions"
scenarios_dir = "joule_vendor_recon/vendor_recon_capability/scenarios"

def add_count_func(filename, prop_name):
    path = os.path.join(funcs_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Add count to result
    new_result = f"result:\n  list: <? {prop_name} ?>\n  count: <? {prop_name}.length ?>\n\naction_groups:"
    content = re.sub(r'result:.*?action_groups:', new_result, content, flags=re.DOTALL)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def add_count_scen(filename, desc):
    path = os.path.join(scenarios_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Add count to response_context
    new_ctx = f"  - value: $target_result.count\n    description: {desc}\n\ntarget:"
    content = re.sub(r'\n\ntarget:', "\n" + new_ctx, content)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

add_count_func("get_purchase_orders.yaml", "po_res.body.value")
add_count_func("get_recon_results.yaml", "rr_res.body.value")
add_count_func("get_exceptions.yaml", "exc_res.body.value")

add_count_scen("view_purchase_orders.yaml", "Total count of purchase orders")
add_count_scen("view_recon_results.yaml", "Total count of match results")
add_count_scen("view_exceptions.yaml", "Total count of exceptions")
