# Vendor Reconcile — Current Project State (Updated Sept 2026)
**SAP-Connected Vendor Reconciliation & Match Exception Engine**

## Executive Summary
Vendor Reconcile provides a centralized operational interface for managing the Procure-to-Pay (P2P) lifecycle. In the current development state, the application has successfully integrated live SAP S21 ERP data streams to fuel a fully functional Executive Analytics Dashboard, dynamic 3-way matching engine, and real-time vendor discrepancy tracking. 

---

## 1. Current SAP Integration Status
The Node.js (SAP CAP) backend is currently successfully pulling live data from the **SAP S21 System** via the following secure OData APIs:
* **Purchase Orders:** `API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder` and `A_PurchaseOrderItem`
* **Supplier Invoices:** `API_SUPPLIERINVOICE_PROCESS_SRV/A_SupplierInvoice` and `A_SuplrInvcItemPurOrdRef`
* **Goods Receipts (GRNs):** `API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem`

### Recent Live Integration Milestones:
* **Real-Time Vendor Names:** The application dynamically queries the S21 Purchase Order endpoint to extract true Supplier Address Names, overriding generic legacy database entries.
* **True Material Lookups:** Invoice line items accurately cross-reference Purchase Order line items to fetch real material IDs (e.g., `10314`, `PA30PALL`) rather than defaulting to static placeholders.
* **Persistent Database Sync:** Migrated from an in-memory test database to a persistent local SQLite database (`sqlite.db`) to ensure synced SAP data and user uploads survive server restarts.

---

## 2. Functional Capabilities Deployed

### A. Executive Analytics Dashboard
The previously mocked dashboard is now 100% data-driven, calculating real-time metrics based on live SAP records:
* **Total Invoices & Match Rates:** Mathematically aggregated from the active `MatchResults` database table.
* **Missing in File (Uninvoiced GRs):** Actively scans the SAP `GrirSnapshot` to highlight open SAP Goods Receipts that have not yet been billed.
* **Missing in S/4:** Flags any vendor invoices where the matching engine fails to locate the corresponding SAP Purchase Order.
* **High-Value Exceptions:** Automatically filters and flags price/quantity mismatches exceeding a threshold (e.g., ?50,000).
* **Vendor Exceptions Chart:** Accurately sorts and displays the specific, real vendor names responsible for active discrepancies.
* **Status Distribution:** Segments mismatches precisely by engine outcome (e.g., `MATCHED/TOLERANCE`, `UNMATCHED/PRICE-DIFF`, `UNMATCHED/QTY-EXCEEDS-GR`).

### B. Automated 3-Way Matching Engine
The core verification engine successfully evaluates uploaded and synced invoices against PO and GR lines. It processes exact tolerances and generates concrete outcome codes:
* `MATCHED/3-WAY-CLEAR`
* `UNMATCHED/PRICE-DIFF`
* `UNMATCHED/QTY-EXCEEDS-GR`
* `UNMATCHED/PO-NOT-FOUND`

---

## 3. Technology Stack Overview
* **Frontend:** SAP UI5 / Fiori Elements (Responsive HTML5 Dashboard & Workbenches)
* **Backend:** Node.js, SAP Cloud Application Programming (CAP) Model v4
* **Database:** Persistent SQLite (Local Development) / HANA-Ready
* **Integration:** REST / OData with basic auth (Base64) passing through to S/4HANA (S21 ERP)

---

## 4. Next Steps & Business Value
* **Dispute Management:** Activating AP Manager workflows to dispute `PRICE-DIFF` or `QTY-EXCEEDS-GR` exceptions directly with the vendor portal.
* **OCR Automation:** Connecting the Grok/Microsoft OCR extraction pipelines to automatically seed invoices from email payloads and populate the "OCR Accuracy" and "Avg. Processing" metrics currently being simulated for demo purposes.
* **Payment Execution:** Enabling UTR (Unique Transaction Reference) clearing workflows back to SAP once an invoice achieves `MATCHED/3-WAY-CLEAR` status.
