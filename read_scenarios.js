const xlsx = require('xlsx');

function readScenarios() {
    const filePath = 'C:\\Users\\dhruv\\Downloads\\SAP_MM_FI_3Way_Match_Test_Scenarios 2.xlsx';
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        console.log(`Found ${data.length} scenarios. Here are the first 15 for analysis:`);
        console.log(JSON.stringify(data.slice(0, 15), null, 2));
        
        // Let's get a summary of the unique Scenario Types / Rules expected
        const categories = new Set(data.map(d => d['Scenario Category'] || d['Category'] || d['Type']));
        console.log('Categories:', Array.from(categories));
    } catch(e) {
        console.error("Error reading excel file:", e.message);
    }
}
readScenarios();
