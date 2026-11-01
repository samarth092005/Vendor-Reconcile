const cds = require('@sap/cds');

async function test() {
  const db = await cds.connect.to('sqlite::memory:');
  
  await db.run(`CREATE TABLE GrirSnapshot (
    purchaseOrder NVARCHAR(10),
    purchaseOrderItem NVARCHAR(5)
  )`);
  
  await db.run(`INSERT INTO GrirSnapshot VALUES ('4500012346', '00010')`);
  await db.run(`INSERT INTO GrirSnapshot VALUES ('4500012346', '20')`);

  let poRef = '4500012346';
  let strItem = '10';
  let paddedItem = '00010';

  try {
    let q1 = SELECT.from('GrirSnapshot').where(`purchaseOrder = ? AND (purchaseOrderItem = ? OR purchaseOrderItem = ?)`, poRef, strItem, paddedItem);
    let r1 = await db.run(q1);
    console.log("Query 1 result:", r1);
  } catch(e) {
    console.log("Query 1 error:", e.message);
  }

  try {
    let q2 = SELECT.from('GrirSnapshot').where({ purchaseOrder: poRef, purchaseOrderItem: { in: [strItem, paddedItem] } });
    let r2 = await db.run(q2);
    console.log("Query 2 result:", r2);
  } catch(e) {
    console.log("Query 2 error:", e.message);
  }

  try {
    let q3 = SELECT.from('GrirSnapshot').where({ purchaseOrder: poRef }).and(`purchaseOrderItem = '${strItem}' or purchaseOrderItem = '${paddedItem}'`);
    let r3 = await db.run(q3);
    console.log("Query 3 result:", r3);
  } catch(e) {
    console.log("Query 3 error:", e.message);
  }
}
test();
