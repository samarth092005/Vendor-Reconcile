const fs = require('fs');

let code = fs.readFileSync('generate_accurate_plan.js', 'utf8');

// 1. Add Architecture Diagram to SECTION 2 (CORE ARCHITECTURE)
const diagramHtml = `
    <div style="margin-top: 15px; background: #eef4fb; border: 1px solid #cfe0f4; padding: 15px; border-radius: 4px; text-align: center;">
        <div style="font-size: 10px; font-weight: bold; color: #0056b3; margin-bottom: 10px;">HIGH-LEVEL ARCHITECTURE DIAGRAM</div>
        <div style="display: flex; justify-content: space-between; align-items: center; max-width: 80%; margin: 0 auto;">
            <div style="background: #fff; border: 2px solid #0056b3; padding: 10px; border-radius: 6px; width: 22%;">
                <strong style="color: #0056b3;">SAP S/4HANA</strong><br><span style="font-size: 8px;">(Live S21 ERP Data)</span>
            </div>
            <div style="color: #0056b3; font-weight: bold; font-size: 14px;">&rarr;</div>
            <div style="background: #0056b3; border: 2px solid #0056b3; color: white; padding: 10px; border-radius: 6px; width: 35%;">
                <strong>SAP CAP ENGINE</strong><br><span style="font-size: 8px; color: #eef4fb;">Matching &amp; AI Intelligence</span>
            </div>
            <div style="color: #0056b3; font-weight: bold; font-size: 14px;">&rarr;</div>
            <div style="background: #fff; border: 2px solid #f26522; padding: 10px; border-radius: 6px; width: 22%;">
                <strong style="color: #f26522;">SAP UI5</strong><br><span style="font-size: 8px;">(Executive Dashboard)</span>
            </div>
        </div>
    </div>
`;

// Insert the diagram after the grid-4 in Section 2
code = code.replace(
    /<div class="box-title-blue">4\. UI5 Frontend<\/div>\s*Consumes the OData services to render the Dashboard and Object Page views\.\s*<\/div>\s*<\/div>/,
    `<div class="box-title-blue">4. UI5 Frontend</div>\n                Consumes the OData services to render the Dashboard and Object Page views.\n            </div>\n        </div>\n${diagramHtml}`
);

// 2. Add BUSINESS KEY SELLING POINTS section at the end (Page 2)
const sellingPointsHtml = `
    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 8 &mdash; BUSINESS KEY SELLING POINTS</div>
    </div>
    <div class="grid-2">
        <div class="box" style="border-left: 3px solid #28a745;">
            <strong style="color:#0056b3; font-size: 11px;">1. Eradication of Manual Effort</strong><br>
            Completely automates the grueling line-by-line comparison of invoices against purchase orders and goods receipts, saving thousands of AP labor hours monthly.
        </div>
        <div class="box" style="border-left: 3px solid #0056b3;">
            <strong style="color:#0056b3; font-size: 11px;">2. Zero Tolerance for Overbilling</strong><br>
            The mathematical matching engine catches identical invoice duplicates and micro-variances in pricing and quantity before they are paid, directly preventing revenue leakage.
        </div>
        <div class="box" style="border-left: 3px solid #f26522;">
            <strong style="color:#0056b3; font-size: 11px;">3. AI-Driven Decision Support</strong><br>
            Instead of raw data dumps, the platform provides actionable AI Suggestions and a holistic AI Score, empowering AP clerks to process complex discrepancies with confidence.
        </div>
        <div class="box" style="border-left: 3px solid #6f42c1;">
            <strong style="color:#0056b3; font-size: 11px;">4. Single Pane of Glass</strong><br>
            Unifies Parked, Blocked, and Approved invoices into one centralized dashboard. Financial controllers gain immediate, real-time visibility into the entire AP pipeline without needing native SAP GUI access.
        </div>
    </div>
`;

// Insert the selling points before the footer on Page 2
code = code.replace(
    /<div class="footer">\s*<div>VENDOR RECONCILIATION &bull; Technical Blueprint &bull; Confidential<\/div>\s*<div>Page 2 of 2<\/div>\s*<\/div>\s*<\/body>/,
    `${sellingPointsHtml}\n    <div class="footer">\n        <div>VENDOR RECONCILIATION &bull; Technical Blueprint &bull; Confidential</div>\n        <div>Page 2 of 2</div>\n    </div>\n</body>`
);

fs.writeFileSync('generate_accurate_plan.js', code);
console.log("UPDATED SCRIPT WITH DIAGRAM AND SELLING POINTS");
