const fs = require('fs');

let code = fs.readFileSync('generate_accurate_plan.js', 'utf8');

// 1. Fix the "mock ERP data" line
code = code.replace(
    /The system ingests mock ERP data \(via the S21 Connector module\)/g, 
    'The system ingests real, live ERP data directly from the SAP S21 system (via the S21 Connector module)'
);

// 2. Add the new capabilities to SECTION 3
const newBoxes = `        <div class="box" style="border:none; border-bottom: 1px solid #dce4ec; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">AI Intelligence &amp; Scoring</strong><br>
            The workbench provides intelligent <strong>AI Suggestions</strong> and computes a holistic <strong>AI Score</strong> for each matched invoice, assisting the AP team in determining the safest course of action for complex variances.
        </div>
        <div class="box" style="border:none; border-bottom: 1px solid #dce4ec; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">Actionable Invoice States</strong><br>
            Empowers AP to set invoice statuses directly in the workbench:<br>
            &bull; <strong>Approved:</strong> Cleared and ready to proceed for payment.<br>
            &bull; <strong>Blocked:</strong> Payment stopped due to critical blockages.<br>
            &bull; <strong>Parked:</strong> Held for unresolved issues. While not posted to SAP, the AP team retains a single centralized view of all actionable documents.
        </div>
`;

// Insert the new boxes into the Section 3 grid
// I will just replace the end of Section 3's grid
const searchStr = `        <div class="box" style="border:none; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">Detailed Object Page</strong><br>
            A deep-dive view comparing the Vendor File header values against the SAP S/4 records side-by-side, complete with a Line Item variance table.
        </div>
    </div>`;

const replaceStr = `        <div class="box" style="border:none; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">Detailed Object Page</strong><br>
            A deep-dive view comparing the Vendor File header values against the SAP S/4 records side-by-side, complete with a Line Item variance table.
        </div>
${newBoxes}
    </div>`;

// But wait, the previous boxes in the grid have 'border-bottom' logic for styling. 
// Detailed Object Page was the last one, so it didn't have border-bottom. I will add border-bottom to it.
code = code.replace(
    /<div class="box" style="border:none; background: transparent; padding: 5px 0;">\s*<div class="bullet"><\/div> <strong style="color:#0056b3">Detailed Object Page<\/strong><br>\s*A deep-dive view comparing the Vendor File header values against the SAP S\/4 records side-by-side, complete with a Line Item variance table\.\s*<\/div>/,
    `<div class="box" style="border:none; border-bottom: 1px solid #dce4ec; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">Detailed Object Page</strong><br>
            A deep-dive view comparing the Vendor File header values against the SAP S/4 records side-by-side, complete with a Line Item variance table.
        </div>`
);

// Now the Detailed Object Page has border-bottom.
// The newBoxes have border-bottom on both. I should remove border-bottom from the last one (Actionable Invoice States).
const newBoxesFixed = `        <div class="box" style="border:none; border-bottom: 1px solid #dce4ec; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">AI Intelligence &amp; Scoring</strong><br>
            The workbench provides intelligent <strong>AI Suggestions</strong> and computes a holistic <strong>AI Score</strong> for each matched invoice, assisting the AP team in determining the safest course of action.
        </div>
        <div class="box" style="border:none; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">Actionable Invoice States</strong><br>
            Empowers AP to set invoice statuses directly in the workbench:<br>
            <span style="color:#555">&bull; <strong>Approved:</strong> Ready to proceed for payment.<br>
            &bull; <strong>Blocked:</strong> Payment stopped due to critical blockages.<br>
            &bull; <strong>Parked:</strong> Held for unresolved issues. (Not posted to SAP, but provides AP a centralized actionable view).</span>
        </div>`;

code = code.replace(
    /<\/div>\s*<\/div>\s*<div class="section-header">\s*<div class="section-bar"><\/div>\s*<div class="section-title">SECTION 4/,
    `</div>\n${newBoxesFixed}\n    </div>\n\n    <div class="section-header">\n        <div class="section-bar"></div>\n        <div class="section-title">SECTION 4`
);

fs.writeFileSync('generate_accurate_plan.js', code);
console.log("UPDATED SCRIPT WITH NEW CAPABILITIES");
