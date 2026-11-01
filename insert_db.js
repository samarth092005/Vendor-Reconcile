const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sqlite.db');
db.run("INSERT INTO vendorrecon_db_MatchResults (ID, outcomeCode, amountDelta, matchRuleApplied, businessRole, invoiceNo) VALUES ('123e4567-e89b-12d3-a456-426614174000', 'MATCHED/3-WAY-CLEAR', 0, 'RULE_3WAY', 'ADMIN', 'TEST_INV_1')");
db.close();
