const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const base64 = fs.readFileSync(path.join(__dirname, 'Fresh_Vendor_Statement.xlsx'), { encoding: 'base64' });
    
    console.log("Uploading Vendor Statement...");
    const res = await fetch('http://localhost:4004/api/v1/uploadStatement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileBase64: base64,
        companyCode: '1000',
        period: '09-2026',
        fiscalYear: '2026',
        fileName: 'Fresh_Vendor_Statement.xlsx'
      })
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);

    const json = JSON.parse(text);
    if (json.value) {
      console.log("Now running matching for Upload ID:", json.value);
      const res2 = await fetch('http://localhost:4004/api/v1/runMatching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementUploadId: json.value })
      });
      const text2 = await res2.text();
      console.log("Matching Status:", res2.status);
      console.log("Matching Response:", text2);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
