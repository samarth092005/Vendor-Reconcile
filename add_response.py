import re

with open("joule_vendor_recon/vendor_recon_capability/scenarios/view_purchase_orders.yaml", "r", encoding="utf-8") as f:
    content = f.read()

response_block = """
response:
  message:
    type: text
    content: |
      Here are the open Purchase Orders:
      
      <? foreach (var po in $target_result) { ?>
      **PO Number:** <? po.purchaseOrder ?>
      **Supplier:** <? po.supplier ?>
      **Quantity:** <? po.poQty ?> | **Amount:** $<? po.poAmount ?>
      **Status:** <? po.status ?>
      
      ---
      <? } ?>
"""

if "response:" not in content:
    content += "\n" + response_block

with open("joule_vendor_recon/vendor_recon_capability/scenarios/view_purchase_orders.yaml", "w", encoding="utf-8") as f:
    f.write(content)
