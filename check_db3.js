const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sqlite.db');

db.all("SELECT receivedQty FROM ReconciliationService_PurchaseOrders LIMIT 5", (err, rows) => {
    console.log(rows);
    db.close();
});
