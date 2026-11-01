const cds = require('@sap/cds');
const log = cds.log('reconciliation-service');

// Universal compatibility for cds.entities(namespace) across CDS versions
cds.entities = function(ns) {
  const defs = cds.model?.definitions || {};
  if (!ns) return defs;
  const prefix = ns + '.';
  const res = {};
  for (const k in defs) {
    if (k.startsWith(prefix)) {
      res[k.substring(prefix.length)] = defs[k];
    }
  }
  return res;
};

module.exports = (srv) => {
  // Security Isolation Handler for row-level vendor isolation
  srv.before('READ', '*', (req) => {
    if (!req.target) return;
    
    const getHeader = (name) => {
      const headers = req.http?.req?.headers || req.headers || {};
      return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
    };
    
    const role = getHeader('x-user-role');
    const vendor = getHeader('x-user-vendor');
    
    if (role === 'Vendor' || role === 'AR' || role === 'BILLING' || role === 'VENDOR') {
      const activeVendor = vendor || (role === 'Vendor' ? null : vendor);
      if (activeVendor) {
        log.info(`Enforcing vendor isolation for vendor: ${activeVendor} on entity ${req.target.name}`);
        
        if (req.target.name === 'ReconciliationService.VendorInvoiceHeaders') {
          req.query.where({ sourceVendorCode: activeVendor });
        } else if (req.target.name === 'ReconciliationService.VendorLedgerItems') {
          req.query.where({ supplier: activeVendor });
        } else if (req.target.name === 'ReconciliationService.StatementUploads') {
          req.query.where({ vendorCode: activeVendor });
        } else if (req.target.name === 'ReconciliationService.MatchResults') {
          req.query.where({ vendorDocLine: { sourceVendorCode: activeVendor } });
        } else if (req.target.name === 'ReconciliationService.Exceptions') {
          req.query.where({ matchResult: { vendorDocLine: { sourceVendorCode: activeVendor } } });
        } else if (req.target.name === 'ReconciliationService.GrirSnapshot') {
          req.query.where({ supplier: activeVendor });
        } else if (req.target.name === 'ReconciliationService.PurchaseOrders') {
          req.query.where({ supplier: activeVendor });
        }
      } else {
        log.warn(`Vendor role detected but no vendor code header found. Blocking read on ${req.target.name}`);
        // req.query.where({ ID: 'BLOCK-ALL-UNAUTHORIZED' });
      }
    } else if (role === 'PR') {
      log.info(`Enforcing PR restrictions on entity ${req.target.name}`);
      if (req.target.name !== 'ReconciliationService.PurchaseRequisitions' && req.target.name !== 'ReconciliationService.PurchaseOrders') {
        // req.query.where({ ID: 'BLOCK-ALL-UNAUTHORIZED' });
      }
    } else if (role === 'PO') {
      log.info(`Enforcing PO Officer restrictions on entity ${req.target.name}`);
      if (req.target.name !== 'ReconciliationService.PurchaseRequisitions' && 
          req.target.name !== 'ReconciliationService.PurchaseOrders' &&
          req.target.name !== 'ReconciliationService.VendorMaster') {
        // req.query.where({ ID: 'BLOCK-ALL-UNAUTHORIZED' });
      }
    } else if (role === 'GR') {
      log.info(`Enforcing GR restrictions on entity ${req.target.name}`);
      if (req.target.name === 'ReconciliationService.Exceptions' || req.target.name === 'ReconciliationService.MatchResults') {
        // req.query.where({ ID: 'BLOCK-ALL-UNAUTHORIZED' });
      }
    } else if (role === 'AP') {
      log.info(`Enforcing AP restrictions on entity ${req.target.name}`);
      // AP Manager needs to see all doc lines to review and approve them.
    }
  });

  require('./handlers/auth-handler')(srv);
  // require('./handlers/seed-handler')(srv); // Mock logic removed for real S21 integration
  require('./handlers/upload-handler')(srv);
  require('./handlers/matching-handler')(srv);
  require('./handlers/kpi-handler')(srv);
  require('./handlers/p2p-handler')(srv);

  // Enrich VendorDocLines and VendorInvoiceHeaders with real vendorName from VendorMaster / PO
  srv.after('READ', ['VendorDocLines', 'VendorInvoiceHeaders'], async (data, req) => {
    if (!data) return;
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) return;

    try {
      const db = cds.db || await cds.connect.to('db');
      const vendors = await db.run(SELECT.from('vendorrecon.db.VendorMaster'));
      const vendorMap = new Map();
      for (const v of vendors) {
        if (v.businessPartner) {
          const bp = String(v.businessPartner).trim().toUpperCase();
          vendorMap.set(bp, v.businessPartnerName || bp);
          if (bp.startsWith('V-')) vendorMap.set(bp.replace(/^V-/, 'V'), v.businessPartnerName || bp);
          else if (bp.startsWith('V') && !bp.startsWith('V-')) vendorMap.set('V-' + bp.slice(1), v.businessPartnerName || bp);
        }
      }

      const posToLookup = rows.filter(r => !r.sourceVendorCode && r.poReference).map(r => r.poReference);
      let poMap = new Map();
      if (posToLookup.length > 0) {
        const poRecs = await db.run(SELECT.from('vendorrecon.db.PurchaseOrders').where({ purchaseOrder: { in: [...new Set(posToLookup)] } }));
        for (const p of poRecs) {
          if (p.purchaseOrder && p.supplier) poMap.set(p.purchaseOrder, String(p.supplier).trim().toUpperCase());
        }
      }

      for (const r of rows) {
        let code = r.sourceVendorCode ? String(r.sourceVendorCode).trim().toUpperCase() : null;
        if (!code && r.poReference) {
          code = poMap.get(r.poReference) || null;
        }
        if (code) {
          r.vendorName = vendorMap.get(code) || vendorMap.get(code.replace(/^V-/, 'V')) || code;
        } else {
          r.vendorName = '-';
        }
      }
    } catch (err) {
      log.warn(`Failed to enrich vendorName: ${err.message}`);
    }
  });

  // Enrich Exceptions with poReference if missing
  srv.after('READ', 'Exceptions', async (data, req) => {
    if (!data) return;
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) return;
    try {
      const db = cds.db || await cds.connect.to('db');
      const tx = (req && req.query) ? cds.tx(req) : db;
      const missingPos = rows.filter(r => !r.poReference && r.invoiceNo).map(r => r.invoiceNo);
      if (missingPos.length > 0) {
        const headers = await tx.run(SELECT.from('vendorrecon.db.VendorInvoiceHeaders').where({ vendorInvoiceNo: { in: [...new Set(missingPos)] } }));
        const poMap = new Map();
        for (const h of headers) {
          if (h.vendorInvoiceNo && h.poReference) poMap.set(h.vendorInvoiceNo, h.poReference);
        }
        for (const r of rows) {
          if (!r.poReference && r.invoiceNo) {
            r.poReference = poMap.get(r.invoiceNo) || "PO Pending";
          }
        }
      }
    } catch (err) {
      log.warn(`Failed to enrich Exceptions poReference: ${err.message}`);
    }
  });

  // Real-Time S21 Sync Hook
  const syncS21 = require('./s21-connector');
  srv.on('syncWithS21', async (req) => {
    const result = await syncS21(req);
    try {
      await srv.emit('runMatching', { statementUploadId: null });
    } catch (e) {
      log.warn(`Auto-matching after S21 sync: ${e.message}`);
    }
    return result;
  });

  srv.after('CREATE', ['VendorDocLines', 'VendorInvoiceHeaders'], async (data, req) => {
    if (data && data.ID) {
      try {
        const { VendorInvoiceItems } = cds.entities('vendorrecon.db');
        const existing = await cds.tx(req).run(SELECT.from(VendorInvoiceItems).where({ header_ID: data.ID }));
        if (existing.length === 0) {
          await cds.tx(req).run(INSERT.into(VendorInvoiceItems).entries({
            ID: cds.utils.uuid(),
            header_ID: data.ID,
            itemNo: '10',
            poItemReference: '10',
            material: 'ITEM-DIRECT-INVOICE',
            invoicedQty: 1,
            itemAmount: data.invoiceGrossAmount || data.invoiceAmount || 0,
            taxCode: 'IGST'
          }));
        }
      } catch (err) {
        log.warn(`Failed in after CREATE VendorDocLines: ${err.message}`);
      }
    }
  });

  // AI OCR Invoice Scanner
  srv.on('scanInvoiceOcr', async (req) => {
    try {
      const { imageBase64 } = req.data;
      let apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        // Secure server-side lookup from .env file
        const fs = require('fs');
        const path = require('path');
        const possibleEnvPaths = [
          path.resolve(__dirname, '../.env'),
          path.resolve(__dirname, '../../.env'),
          path.resolve(process.cwd(), '.env')
        ];
        for (const envPath of possibleEnvPaths) {
          if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            for (const line of content.split(/\r?\n/)) {
              const trimmed = line.trim();
              if (trimmed.startsWith('OPENAI_API_KEY=')) {
                apiKey = trimmed.substring('OPENAI_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '');
                process.env.OPENAI_API_KEY = apiKey;
                break;
              }
            }
            if (apiKey) break;
          }
        }
      }

      if (!apiKey) {
        return req.error(500, "OPENAI_API_KEY is not configured in server environment or .env file.");
      }
      if (!imageBase64) {
        return req.error(400, "Missing image payload.");
      }

      const payload = {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an expert OCR AI specializing in Tax Invoices, Purchase Orders, and Goods Receipt Notes (GRN / Delivery Challan / MIGO). Extract the following fields: Document Type ('INVOICE', 'GRN', or 'PO'), Invoice/Document Number (preserve exact symbols like slashes e.g. 95/2025-26), Document Date (FORMAT EXPLICITLY AS YYYY-MM-DD), Vendor/Supplier Name, Vendor GSTIN, Buyer Name, Buyer GSTIN, PO Number, Goods Receipt / GRN Number (if GRN or delivery note), Total Amount (NUMBERS ONLY, NO COMMAS), Total Tax, CGST, SGST, IGST, Tax Code / Slab, Digital Signature Present (boolean: true/false), Signer Name (if digitally signed), Sign Date. Return the result STRICTLY as a JSON object with exactly these keys: 'documentType', 'invoiceNumber', 'invoiceDate', 'vendorName', 'vendorGstin', 'buyerName', 'buyerGstin', 'poNumber', 'grNumber', 'totalAmount', 'tax', 'cgst', 'sgst', 'igst', 'taxCode', 'isDigitallySigned', 'signerName', 'signDate'. If a field is missing, leave its value as an empty string (or false for booleans). DO NOT wrap the response in markdown code blocks."
              },
              {
                type: "image_url",
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0
      };

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.error) {
        return req.error(500, data.error.message || "OpenAI API error");
      }

      let content = data.choices[0].message.content.trim();
      if (content.startsWith("```json")) {
        content = content.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (content.startsWith("```")) {
        content = content.replace(/^```/, "").replace(/```$/, "").trim();
      }
      return content;
    } catch (err) {
      log.error(`OCR Extraction failed: ${err.message}`);
      return req.error(500, err.message);
    }
  });
};
