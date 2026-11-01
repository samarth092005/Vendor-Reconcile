const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const base64 = fs.readFileSync(path.join(__dirname, 'Fresh_SAP_Ledger.xlsx'), { encoding: 'base64' });
    
    console.log("Uploading SAP Ledger...");
    const res = await fetch('http://localhost:4004/api/v1/seedSapMockData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: base64 })
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error(err);
  }
}
run();
