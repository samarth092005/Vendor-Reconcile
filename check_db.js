const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite');

db.all("SELECT receivedQty FROM vendordoclines_PurchaseOrders LIMIT 2", (err, rows) => {
    console.log(rows);
    db.close();
});
