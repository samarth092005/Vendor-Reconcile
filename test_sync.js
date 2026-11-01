async function run() {
  console.log("Triggering S21 Real-Time Sync...");
  try {
    const res = await fetch('http://localhost:4004/api/v1/syncWithS21', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const text = await res.text();
    console.log("Response Status:", res.status);
    console.log("Response Body:", text);
  } catch(e) {
    console.error("Error triggering sync:", e);
  }
}
run();
