const XLSX = require('xlsx');
const cds = require('@sap/cds');
const { parseSheet } = require('./xlsx-utils');

const log = cds.log('upload-handler');

module.exports = (srv) => {
  srv.on('uploadStatement', async (req) => {
    try {
      const { fileBase64, companyCode = '1000', period = '04-2026', fiscalYear = '2026', fileName = 'statement.xlsx' } = req.data;
      if (!fileBase64) return req.error(400, 'Statement file data is missing.');

      const workbook = XLSX.read(Buffer.from(fileBase64, 'base64'), { type: 'buffer' });
      
      if (!workbook.SheetNames.length) return req.error(400, 'Uploaded Excel workbook is empty.');
      
      const sheet = parseSheet(workbook.Sheets[workbook.SheetNames[0]], 'VendorCode');
      const { VendorInvoiceHeaders, VendorInvoiceItems, VendorMaster, StatementUploads } = cds.entities('vendorrecon.db');

      if (!sheet.length) {
        return req.error(400, "No rows found in the uploaded statement. Please ensure the columns match the template (including 'VendorCode').");
      }

      const vendorCode = String(sheet[0].VendorCode);
      log.info(`Processing statement upload for vendor: ${vendorCode}`);

      const vendor = await SELECT.one.from(VendorMaster).where({ businessPartner: vendorCode });
      if (!vendor) {
        return req.error(400, `Vendor '${vendorCode}' not found in the master database. Please seed the database first with matching vendor master records.`);
      }

      const statementUploadId = cds.utils.uuid();
      
      const headersMap = {};
      const allItems = [];

      sheet.forEach(row => {
        const invNo = row.VendorInvoiceNo ? String(row.VendorInvoiceNo) : `GEN-${cds.utils.uuid().slice(0, 8)}`;
        
        if (!headersMap[invNo]) {
          headersMap[invNo] = {
            ID: cds.utils.uuid(),
            statementUploadId,
            uploadHeader_ID: statementUploadId,
            ingestionSource: 'BATCH_UPLOAD',
            vendorInvoiceNo: invNo,
            invoiceDate: row.InvoiceDate || null,
            invoiceGrossAmount: row.InvoiceGrossAmount || row.InvoiceAmount || 0,
            currency: row.Currency || 'INR',
            poReference: row.PoReference ? String(row.PoReference) : null,
            paymentReference: row.PaymentReference ? String(row.PaymentReference) : null,
            sourceVendorCode: vendorCode,
            sourceGstin: row.Gstin ? String(row.Gstin) : null,
            irn: row.Irn || null,
            irnStatus: row.IrnStatus || null,
            eWayBill: row.EwayBill || null,
            gstr2bStatus: row.Gstr2bStatus || null,
            placeOfSupply: row.PlaceOfSupply || null,
            unplannedDeliveryCosts: row.UnplannedDeliveryCosts || 0,
            approvedForPayment: false,
            paymentStatus: 'UNPAID'
          };
        }

        allItems.push({
          ID: cds.utils.uuid(),
          header_ID: headersMap[invNo].ID,
          itemNo: row.ItemNo ? String(row.ItemNo) : '10',
          material: row.Material ? String(row.Material) : 'RM-STEEL-100',
          poItemReference: row.PoItemReference ? String(row.PoItemReference) : (row.PoReference ? '10' : null),
          invoicedQty: row.InvoicedQty || row.Qty || 0,
          unitPrice: row.UnitPrice || 0,
          itemAmount: row.ItemAmount || 0,
          taxAmount: row.TaxAmount || 0,
          taxCode: row.TaxCode || null,
          hsnCode: row.HsnCode || null,
          gstTdsAmount: row.GstTdsAmount || null
        });
      });

      const headers = Object.values(headersMap);

      log.info(`Parsed ${headers.length} invoice headers and ${allItems.length} invoice items for matching.`);

      await cds.tx(req).run(async (tx) => {
        log.info('Deactivating previous active statement uploads for this vendor and period...');
        await tx.run(
          UPDATE(StatementUploads)
            .set({ isActive: false })
            .where({ vendorCode, companyCode, period, fiscalYear, isActive: true })
        );

        log.info('Creating new StatementUploads header...');
        await tx.run(
          INSERT.into(StatementUploads).entries({
            ID: statementUploadId,
            vendorCode,
            companyCode,
            period,
            fiscalYear,
            fileName,
            status: 'EXTRACTED',
            isActive: true
          })
        );

        log.info('Saving new invoice headers and items to the database...');
        await tx.run(INSERT.into(VendorInvoiceHeaders).entries(headers));
        await tx.run(INSERT.into(VendorInvoiceItems).entries(allItems));
      });

      log.info(`Statement saved successfully under Upload ID: ${statementUploadId}. Triggering matching engine event...`);
      await srv.emit('runMatching', { statementUploadId });

      return statementUploadId;
    } catch (err) {
      log.error('Failed to upload and parse statement:', err);
      return req.error(500, `Upload failed: ${err.message}`);
    }
  });
};
