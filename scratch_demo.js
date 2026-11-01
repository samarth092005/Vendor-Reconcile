const fs = require('fs');

async function run() {
  const sapLedgerBase64 = fs.readFileSync('Master_SAP_Ledger_Mock.xlsx').toString('base64');
  const statementBase64 = fs.readFileSync('Master_Test_Statement.xlsx').toString('base64');
  
  console.log('Uploading SAP Ledger...');
  let res = await fetch('http://localhost:4004/api/v1/seedSapMockData', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'AP' },
    body: JSON.stringify({ fileBase64: sapLedgerBase64 })
  });
  if(!res.ok) throw new Error('SAP Ledger upload failed: ' + await res.text());
  console.log('SAP Ledger uploaded successfully.');
  
  console.log('Uploading Vendor Statement...');
  res = await fetch('http://localhost:4004/api/v1/uploadStatement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'AP' },
    body: JSON.stringify({
      fileBase64: statementBase64,
      companyCode: '1000',
      period: '04-2026',
      fiscalYear: '2026',
      fileName: 'Master_Test_Statement.xlsx'
    })
  });
  if(!res.ok) throw new Error('Statement upload failed: ' + await res.text());
  console.log('Vendor Statement uploaded successfully.');
  
  console.log('Checking Exceptions...');
  res = await fetch('http://localhost:4004/api/v1/Exceptions', {
    headers: { 'x-user-role': 'AP' }
  });
  const exceptions = await res.json();
  console.log('Total exceptions found:', exceptions.value.length);
  
  if (exceptions.value.length > 0) {
    const exc = exceptions.value.find(e => e.outcomeCode === 'UNMATCHED/PRICE-HIGH') || exceptions.value[0];
    console.log(`Raising dispute on exception ${exc.ID} (Invoice: ${exc.invoiceNo} | Outcome: ${exc.outcomeCode})...`);
    res = await fetch('http://localhost:4004/api/v1/raiseDispute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'AP' },
      body: JSON.stringify({
        exceptionId: exc.ID,
        comment: "Your invoice amount does not match our PO. Please advise."
      })
    });
    if(!res.ok) throw new Error('Failed to raise dispute: ' + await res.text());
    console.log('Dispute raised successfully.');
  }
}

run().catch(console.error);
