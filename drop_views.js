const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sqlite.db');

db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='view'", (err, rows) => {
        if(err) return console.error(err);
        rows.forEach(row => {
            db.run("DROP VIEW IF EXISTS " + row.name);
            console.log("Dropped view " + row.name);
        });
    });
});
db.close();
