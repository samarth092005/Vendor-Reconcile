require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testFetch() {
    const apiUrl = process.env.S21_API_URL;
    const username = process.env.S21_USERNAME;
    const password = process.env.S21_PASSWORD;

    const authBuffer = Buffer.from(`${username}:${password}`).toString('base64');
    const targetUrl = `${apiUrl}/A_PurchaseOrder?$top=2&$format=json&sap-client=800`;

    console.log("Fetching from:", targetUrl);

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authBuffer}`,
                'Accept': 'application/json'
            }
        });

        const text = await response.text();
        console.log("Raw Response:");
        console.log(text.substring(0, 1500));
    } catch (err) {
        console.error("Error:", err);
    }
}

testFetch();
