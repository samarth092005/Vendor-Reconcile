const fs = require('fs');
const puppeteer = require('puppeteer');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; font-size: 10px; color: #1a1a1a; margin: 0; padding: 30px 40px; box-sizing: border-box; }
        .page-break { page-break-before: always; }
        
        .header-top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0056b3; padding-bottom: 8px; margin-bottom: 15px; }
        .logo-area { display: flex; align-items: baseline; gap: 10px; }
        .logo-text { font-size: 24px; font-weight: 800; color: #0056b3; letter-spacing: -0.5px; }
        .logo-sub { font-size: 18px; font-weight: 600; color: #333; }
        .tagline { font-size: 11px; font-weight: 600; color: #0056b3; margin-top: 2px; }
        .meta-right { text-align: right; font-size: 9px; color: #555; line-height: 1.4; }
        .meta-right strong { color: #0056b3; font-size: 10px; }
        
        .exec-summary { background: #f8f9fa; border-left: 3px solid #0056b3; padding: 10px 15px; font-size: 10px; line-height: 1.4; margin-bottom: 15px; }
        .exec-summary strong { color: #0056b3; }
        
        .section-header { display: flex; align-items: center; gap: 10px; background: #f0f4f8; margin: 15px 0 8px 0; padding: 4px 0; }
        .section-bar { width: 8px; height: 16px; background: #f26522; }
        .section-title { font-size: 12px; font-weight: 700; color: #0056b3; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .grid-1 { display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 10px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        .grid-5 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        
        .box { border: 1px solid #dce4ec; background: #fafbfc; padding: 10px; }
        .box-title { font-size: 10px; font-weight: 700; color: #0056b3; margin-bottom: 4px; }
        .box-title-blue { font-size: 10px; font-weight: 700; color: #0056b3; }
        
        .text-block { font-size: 10px; line-height: 1.4; margin-bottom: 10px; }
        .bullet { margin-left: 15px; padding-left: 5px; margin-bottom: 2px; }
        .bullet::before { content: "&diams;"; color: #0056b3; display: inline-block; width: 1em; margin-left: -1em; }
        .bullet-tick::before { content: "&check;"; color: #28a745; display: inline-block; width: 1em; margin-left: -1em; font-weight: bold; }
        
        .workflow-step { text-align: center; border: 1px solid #dce4ec; padding: 8px 4px; background: #fff; }
        .wf-num { font-size: 9px; font-weight: 700; color: #0056b3; text-transform: uppercase; }
        .wf-title { font-size: 10px; font-weight: 700; margin: 4px 0; }
        .wf-sub { font-size: 9px; color: #555; }
        .wf-note { font-size: 9px; background: #f8f9fa; border: 1px solid #dce4ec; padding: 6px; margin-top: 4px; color: #555; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
        th { background: #0056b3; color: white; text-align: left; padding: 6px 8px; font-weight: 600; border: 1px solid #0056b3; }
        td { padding: 6px 8px; border: 1px solid #dce4ec; vertical-align: top; }
        
        .code-snippet { background: #f4f6f8; font-family: monospace; font-size: 8px; padding: 4px; color: #0056b3; }
        .tech-box { background: #f8f9fa; border: 1px solid #dce4ec; padding: 8px; }
        
        .footer { position: fixed; bottom: 20px; left: 40px; right: 40px; font-size: 8px; color: #777; display: flex; justify-content: space-between; border-top: 1px solid #dce4ec; padding-top: 5px; }
    </style>
</head>
<body>

    <!-- PAGE 1 -->
    <div class="header-top">
        <div>
            <div class="logo-area">
                <div class="logo-text">RECONLY</div>
                <div class="logo-sub">&mdash; Project Plan</div>
            </div>
            <div class="tagline">SAP S/4HANA-Connected AI Accounts Payable Reconciliation Platform</div>
        </div>
        <div class="meta-right">
            <strong>PROJECT PLAN</strong><br>
            Version 1.0 &bull; October 2026
        </div>
    </div>

    <div class="exec-summary">
        <strong>Executive Summary:</strong> RECONLY provides a centralized operational execution interface for managing SAP-connected purchase orders, goods receipts, AI-assisted vendor invoice extraction, and automated 3-way matching through to SAP MIRO supplier invoice parking and exception management.
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 1 &mdash; USE CASE</div>
    </div>
    <div class="box" style="padding: 10px 15px;">
        Vendor invoice reconciliation against SAP Purchase Orders and Goods Receipts runs largely on manual data entry and offline email chains. Finance teams spend weeks validating material quantities, tax amounts, and unit prices before SAP MIRO parking. Third-party vendors have no SAP access and zero visibility into invoice disputes. <strong>Need:</strong> Cloud-native execution (OCR intake, automated variance detection, collaborative dispute resolution) tied directly to S/4HANA POs and GRNs, with SAP remaining the single financial system of record and vendors needing no SAP license.
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 2 &mdash; REFERENCE USE CASE</div>
    </div>
    <div class="box" style="padding: 0;">
        <div style="padding: 10px 15px; border-bottom: 1px solid #dce4ec;">
            <strong>Accounting alignment (Procure-To-Pay Validation):</strong> RECONLY supplies the computational evidence for the standard SAP procure-to-pay <strong>3-way match</strong> (PO &rarr; Goods Receipt &rarr; Supplier Invoice).
        </div>
        <div class="grid-5" style="margin: 0; gap: 0;">
            <div style="padding: 10px; border-right: 1px solid #dce4ec;">
                <div class="box-title-blue">1. Purchase Order</div>
                Target quantities and net prices synced live from S/4HANA (ME23N).
            </div>
            <div style="padding: 10px; border-right: 1px solid #dce4ec;">
                <div class="box-title-blue">2. Goods Receipt</div>
                Actual physical material receipt logs (MIGO) verifying delivery.
            </div>
            <div style="padding: 10px; border-right: 1px solid #dce4ec;">
                <div class="box-title-blue">3. Vendor Invoice</div>
                Digital PDFs uploaded by vendors or scraped via AI/OCR mapping.
            </div>
            <div style="padding: 10px; border-right: 1px solid #dce4ec;">
                <div class="box-title-blue">4. Tolerance Engine</div>
                Per-line validation of Price &amp; Qty against configured thresholds.
            </div>
            <div style="padding: 10px;">
                <div class="box-title-blue">5. Recognition</div>
                On verified match: automated SAP MIRO parking and status clear.
            </div>
        </div>
        <div style="padding: 10px 15px; border-top: 1px solid #dce4ec; background: #fafbfc;">
            <strong>Reconciliation:</strong> every document line is reconciled across three points before recognition and posting: SAP PO quantity/price &harr; SAP GR verified quantity &harr; OCR-verified vendor invoice. Differences beyond tolerance are held in the exception review queue for approval, and each override is logged with user and timestamp, giving an audit-ready trail from contract to settlement.
        </div>
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 3 &mdash; SOLUTION: RECONLY AT A GLANCE</div>
    </div>
    <div class="text-block">
        RECONLY is an enterprise operational execution platform designed to bridge SAP S/4HANA with day-to-day accounts payable logistics and supplier billing. Used by AP Specialists, Finance Managers, and external vendors, RECONLY manages the digital realization of the P2P lifecycle. By retrieving active POs and GRNs directly from SAP S/4HANA, RECONLY governs invoice ingestion, line-item tolerance validation, AI anomaly detection, and automated posting, delivering end-to-end operational visibility while preserving SAP as the single authoritative financial core. A <strong>CAP</strong> service layer fetches SAP data and serves role-governed APIs; the platform runs on <strong>SAP BTP Cloud Foundry</strong>.
    </div>
    <div class="grid-3">
        <div class="box">
            <div class="bullet-tick"></div> <strong>Direct SAP S/4HANA Alignment</strong><br>
            Live ingestion of active POs &amp; GRs via real-time OData / REST services.
        </div>
        <div class="box">
            <div class="bullet-tick"></div> <strong>AI-Powered Line Matching</strong><br>
            Automated mathematical engine eliminates manual multi-screen staring &amp; payload disputes.
        </div>
        <div class="box">
            <div class="bullet-tick"></div> <strong>Automated Settlement &amp; MIRO</strong><br>
            Clear matches feed verified financial data directly into SAP MIRO invoice parking.
        </div>
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 4 &mdash; KEY CAPABILITIES</div>
    </div>
    <div class="grid-2">
        <div class="box" style="border:none; border-bottom: 1px solid #dce4ec; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">SAP S/4HANA Synchronization</strong><br>
            Direct ingestion of active purchase orders (ME23N) with materials, target tonnage, agreed rates, and goods receipts.
        </div>
        <div class="box" style="border:none; border-bottom: 1px solid #dce4ec; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">Vendor Portal &amp; Invoice Intake</strong><br>
            Role-secured portal for vendors to upload digital invoice PDFs, track payment statuses, and review active PO limits.
        </div>
        <div class="box" style="border:none; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">3-Way Match &amp; Variance Engine</strong><br>
            Captures and compares file quantities and net amounts against S/4 limits to guarantee accuracy and detect price/qty loss.
        </div>
        <div class="box" style="border:none; background: transparent; padding: 5px 0;">
            <div class="bullet"></div> <strong style="color:#0056b3">Executive AP Dashboard</strong><br>
            Real-time analytics summarizing high-value exceptions, duplicate attempts, processing speeds, and missing GRNs.
        </div>
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 5 &mdash; ROLE-BASED OPERATIONS</div>
    </div>
    <div class="grid-5">
        <div class="box">
            <div class="box-title-blue">[AP] AP Specialist</div>
            Manages invoice review queues, exception handling, and investigates mismatched line items.
        </div>
        <div class="box">
            <div class="box-title-blue">[VN] Vendor</div>
            Accepts allocated POs, uploads digital invoice PDFs, and monitors dispute/payment statuses.
        </div>
        <div class="box">
            <div class="box-title-blue">[PO] Procurement</div>
            Authorizes material pricing changes, overrides tolerance locks, and updates ME23N master records.
        </div>
        <div class="box">
            <div class="box-title-blue">[GR] Yard / Warehouse</div>
            Executes material receiving, logs MIGO intake, and uploads stamped physical delivery slips.
        </div>
        <div class="box">
            <div class="box-title-blue">[FM] Finance Manager</div>
            Reviews high-value financial variances, executes final MIRO invoice approvals, and audits overall workflow.
        </div>
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 6 &mdash; END-TO-END OPERATIONAL WORKFLOW</div>
    </div>
    <div class="grid-5" style="gap:4px;">
        <div class="workflow-step">
            <div class="wf-num">STEP 1</div>
            <div class="wf-title">SAP S/4HANA Sync</div>
            <div class="wf-sub">Contracts, POs &amp; GRNs</div>
        </div>
        <div class="workflow-step">
            <div class="wf-num">STEP 2</div>
            <div class="wf-title">Invoice Ingestion</div>
            <div class="wf-sub">Vendor Upload / OCR</div>
        </div>
        <div class="workflow-step">
            <div class="wf-num">STEP 3</div>
            <div class="wf-title">Matching Engine</div>
            <div class="wf-sub">Automated 3-Way Variance</div>
        </div>
        <div class="workflow-step">
            <div class="wf-num">STEP 4</div>
            <div class="wf-title">Exception Review</div>
            <div class="wf-sub">AP Desk Tolerance Approvals</div>
        </div>
        <div class="workflow-step">
            <div class="wf-num">STEP 5</div>
            <div class="wf-title">SAP MIRO Clear</div>
            <div class="wf-sub">Park &amp; Post Invoice Settlement</div>
        </div>
    </div>
    <div class="wf-note">
        <strong>Operational Data Continuity:</strong> SAP S/4HANA Purchase Orders &amp; Master Data &bull; Vendor Digital Intake &bull; AI OCR Extraction &bull; Dynamic Tolerance Mathematical Verification &bull; SAP MIRO Supplier Invoicing &amp; Payment Clearing.
    </div>

    <div class="footer">
        <div>RECONLY &bull; Project Plan v1.0 &bull; Confidential</div>
        <div>Page 1 of 2</div>
    </div>

    <!-- PAGE 2 -->
    <div class="page-break"></div>
    <div class="header-top">
        <div>
            <div class="logo-area">
                <div class="logo-text">RECONLY</div>
                <div class="logo-sub">&mdash; Integration &amp; Architecture</div>
            </div>
            <div class="tagline">SAP S/4HANA Integration, Architectural Blueprint &amp; Enterprise Value</div>
        </div>
        <div class="meta-right">
            <strong>ENTERPRISE BLUEPRINT</strong><br>
            Page 2 of 2
        </div>
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 7 &mdash; SAP S/4HANA INTEGRATION</div>
    </div>
    <table>
        <tr>
            <th width="20%">Integration Dimension</th>
            <th width="45%">Data Scope &amp; Functional Mapping</th>
            <th width="35%">Data Governance &amp; Storage Boundary</th>
        </tr>
        <tr>
            <td><strong>Inbound from SAP S/4HANA</strong><br><span style="color:#666;font-weight:normal;">OData / REST APIs</span></td>
            <td>Purchase Orders (ME23N), Line Items, Target Qty, Unit Rates, Goods Receipts (MIGO), Vendor Master (LFA1).</td>
            <td>Retrieved from SAP. Master records remain governed exclusively in SAP S/4HANA; cached for operational display.</td>
        </tr>
        <tr>
            <td><strong>Operational Processing</strong><br><span style="color:#666;font-weight:normal;">RECONLY Core Layer</span></td>
            <td>Digital Invoice captures, 3-way line item arithmetic, tolerance overrides, AP validation stamps.</td>
            <td>Stored in RECONLY. Field execution logs and audit telemetry are persisted in RECONLY's transactional database.</td>
        </tr>
        <tr>
            <td><strong>Outbound to SAP S/4HANA</strong><br><span style="color:#666;font-weight:normal;">ABAP RFC / MIRO API</span></td>
            <td>Verified line quantities, Supplier Invoice parking/posting (MIRO triggers), ArchiveLink PDF attachments.</td>
            <td>Posted to SAP. Final financial and compliance artifacts are transmitted back to SAP for settlement.</td>
        </tr>
    </table>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 8 &mdash; HIGH-LEVEL SOLUTION ARCHITECTURE</div>
    </div>
    <div class="box" style="padding: 0; margin-bottom: 10px;">
        <div style="padding: 6px 10px; background: #eef4fb; border-bottom: 1px solid #dce4ec;">
            <strong style="color:#0056b3">1. Enterprise ERP Layer (SAP S/4HANA System of Record)</strong> SAP S/4HANA<br>
            <span style="color:#555">Purchase Orders (ME23N) &bull; Goods Receipts (MIGO) &bull; Supplier Invoices (MIRO) &bull; ArchiveLink / DMS</span>
        </div>
        <div style="padding: 2px 0; text-align: center; color: #0056b3; font-size: 8px; font-family: monospace;">
            &lt;&gt; Secure SAP Integration Layer (REST &bull; OData &bull; RFC Proxy &bull; Destination Service &bull; Sync Logs) &lt;&gt;
        </div>
        <div style="padding: 6px 10px; background: #fafbfc; border-top: 1px solid #dce4ec; border-bottom: 1px solid #dce4ec;">
            <strong style="color:#0056b3">2. RECONLY Operational Core Platform (Execution &amp; Verification Layer)</strong> CAP &bull; Node.js &bull; Express &bull; SQLite WAL (HANA Cloud option) &bull; SAP BTP Cloud Foundry<br>
            <span style="color:#555">Mathematical Matching Engine &bull; AI Document Matching Desk &bull; Tolerance &amp; Variance Engine &bull; Exception Review Queue &bull; Audit Event Logger</span>
        </div>
        <div style="padding: 2px 0; text-align: center; color: #0056b3; font-size: 8px; font-family: monospace;">
            &lt;&gt; Role-Governed Secure Web Endpoints (XSUAA / JWT Authentication &bull; RBAC) &lt;&gt;
        </div>
        <div style="padding: 6px 10px; background: #eef4fb;">
            <strong style="color:#0056b3">3. Role-Tailored Operational Consoles (SAP Fiori-Inspired UX)</strong> SAP UI5 1.120 &bull; Fiori Horizon Theme &bull; Web/Mobile<br>
            <span style="color:#555">AP: Executive Dashboard &amp; Exception Queue &bull; VN: Transporter Portal &amp; Invoice Uploads &bull; FM: Approvals Tower</span>
        </div>
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 9 &mdash; TECHNOLOGY OVERVIEW</div>
    </div>
    <div class="grid-4">
        <div class="tech-box">
            <strong style="color:#0056b3">FRONTEND</strong><br>
            SAP UI5 &bull; Fiori XML Views<br>JavaScript (ES6), OData V4 Models
        </div>
        <div class="tech-box">
            <strong style="color:#0056b3">BACKEND SERVICES</strong><br>
            Node.js &bull; Express &bull; SAP CAP<br>RESTful / OData V4 API
        </div>
        <div class="tech-box">
            <strong style="color:#0056b3">SAP INTEGRATION</strong><br>
            S/4HANA OData / REST<br>RFC Proxy, S21 Custom Connector
        </div>
        <div class="tech-box">
            <strong style="color:#0056b3">DATA STORE &amp; PLATFORM</strong><br>
            SQLite (WAL) &mdash; current build<br>SAP BTP Cloud Foundry (MTA)
        </div>
    </div>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 10 &mdash; DEPLOYMENT, SAP APIs &amp; POLICY (SAP BTP CLOUD FOUNDRY)</div>
    </div>
    <table>
        <tr><td width="15%"><strong>Deployment</strong></td><td>MTA (mta.yaml) to SAP BTP Cloud Foundry: CAP Node.js service; UI5 HTML5 Repository + Approuter. Persistence: SQLite now; SAP HANA Cloud (HDI container) for production via CAP DB binding.</td></tr>
        <tr><td><strong>Auth &amp; Access</strong></td><td>XSUAA (IAS as identity provider); JWT on every endpoint; role collections mapped to AP / VN / PO / GR / FM; record-level checks by vendor profile.</td></tr>
        <tr><td><strong>Connectivity</strong></td><td>Destination and Connectivity services; Cloud Connector if S/4HANA is on-premise; least-privilege technical user; credentials held in bound service keys, never in code.</td></tr>
        <tr><td><strong>SAP APIs</strong></td><td>Inbound OData: API_PURCHASEORDER_PROCESS_SRV, API_SUPPLIERINVOICE_PROCESS_SRV, Vendor Master. Outbound: Supplier Invoice (MIRO).</td></tr>
        <tr><td><strong>Data Policy</strong></td><td>SAP owns master and financial data; RECONLY caches for matching display only. Execution logs, overrides, and PDF scans held in RECONLY under a defined retention period. TLS in transit.</td></tr>
    </table>

    <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">SECTION 11 &mdash; BUSINESS VALUE</div>
    </div>
    <div class="grid-2" style="margin-bottom: 20px;">
        <div class="box">
            <strong style="color:#0056b3">Unified Operational Truth</strong><br>
            Bridges SAP S/4HANA with field vendors and receiving yards without requiring third-party suppliers to hold full enterprise SAP user licenses.
        </div>
        <div class="box">
            <strong style="color:#0056b3">Dispute-Free Invoice Verification</strong><br>
            Mandatory automated mathematical engine captures qty and price variances at the line level, eliminating human-error payload discrepancies and disputes.
        </div>
        <div class="box">
            <strong style="color:#0056b3">Compressed Settlement Cycles</strong><br>
            Immediate digital ingestion paired with real-time backend evaluation replaces multi-week physical paper transit, collapsing billing and MIRO clearing to hours.
        </div>
        <div class="box">
            <strong style="color:#0056b3">Complete Audit Governance</strong><br>
            Every PO ingestion, invoice receipt, tolerance override, and MIRO posting is immutably timestamped with user credentials and audit logs.
        </div>
    </div>

    <div class="box" style="background: #eef4fb; border-color: #0056b3;">
        <strong>SOLUTION APPROACH &amp; POSITIONING</strong><br>
        RECONLY provides a purpose-built operational execution and verification layer around SAP-connected contract and purchase order workflows. It enables business users, logistics providers, and vendors to collaborate through a modern, role-based interface while preserving strict alignment, security, and traceability with SAP S/4HANA business data.
    </div>

    <div class="footer">
        <div>RECONLY &bull; Project Plan v1.0 &bull; Confidential</div>
        <div>Page 2 of 2</div>
    </div>

</body>
</html>
`;

fs.writeFileSync('reconly_plan_detailed.html', htmlContent);

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.goto('file://' + __dirname + '/reconly_plan_detailed.html', { waitUntil: 'networkidle0' });
        await page.pdf({ 
            path: 'Vendor_Reconcile_Project_Plan.pdf', 
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });
        await browser.close();
        console.log("PDF generated successfully!");
    } catch (e) {
        console.error(e);
    }
})();
