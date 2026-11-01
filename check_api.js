const http = require('http');
http.get('http://localhost:4004/api/v1/PurchaseOrders', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data.substring(0, 500)));
});
