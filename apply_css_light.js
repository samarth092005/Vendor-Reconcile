const fs = require('fs');

const newCss = `/* Vendor Reconciliation Dashboard - Modern Fintech Theme */

/* Layout wrappers */
.vrDashboardPage .sapMPageEnableScrolling { 
  background: #F8FAFC; /* Slate 50 - Much cleaner than default gray */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.vrHeaderBar {
  background: #FFFFFF;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #E2E8F0; /* Slate 200 */
}
.vrHeaderTitle { font-size: 1.375rem; font-weight: 600; color: #1E293B; /* Slate 800 */ }
.vrHeaderSubtitle { color: #64748B; font-size: 0.8125rem; /* Slate 500 */ }

/* KPI card grid */
.vrKpiGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-gap: 0.75rem;
  padding: 0.75rem 1rem;
}
.vrKpiCard {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 0.75rem; /* 12px for modern feel */
  padding: 1rem 1.25rem;
  min-height: 92px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); /* Soft elevation */
  transition: box-shadow .2s ease, transform .2s ease;
  cursor: default;
}
.vrKpiCard:hover { 
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); /* Float effect */
  transform: translateY(-2px);
}
.vrKpiLabel {
  font-size: 0.75rem;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.vrKpiValue {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0F172A; /* Slate 900 */
  line-height: 1.15;
}
.vrKpiDelta {
  font-size: 0.75rem;
  margin-top: 0.35rem;
  font-weight: 600;
}

/* Semantic Status Colors (Deltas) */
.vrKpiDelta.up   { color: #059669; } /* Emerald 600 */
.vrKpiDelta.down { color: #E11D48; } /* Rose 600 */
.vrKpiDelta.neutral { color: #64748B; } /* Slate 500 */
.vrKpiDelta.upBad   { color: #E11D48; } 
.vrKpiDelta.downGood { color: #059669; } 

.vrKpiCard.severity-good     { border-top: 3px solid #10B981; }
.vrKpiCard.severity-warning  { border-top: 3px solid #F59E0B; }
.vrKpiCard.severity-error    { border-top: 3px solid #EF4444; }
.vrKpiCard.severity-info     { border-top: 3px solid #6366F1; }

/* Chart grid */
.vrChartGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  grid-gap: 0.75rem;
  padding: 0 1rem 0.75rem;
}
.vrChartCard {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.vrChartTitle {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 0.75rem;
  display: block;
}
.vrChartHost {
  width: 100%;
  height: 320px;
  display: block;
  overflow: hidden;
}
.vrChartHost svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* Result table container */
.vrTableCard {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 0.75rem;
  margin: 0 1rem 1rem;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.vrRowActions .sapMBtn { margin-right: 0.25rem; }

/* Object page */
.vrOpHeader { background: #FFFFFF; border-bottom: 1px solid #E2E8F0; }
.vrOpAiPanel {
  background: #EFF6FF; /* Blue 50 */
  border: 1px solid #BFDBFE; /* Blue 200 */
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
}
.vrOpComparePanel {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  box-shadow: 0 2px 4px -1px rgba(0,0,0,0.03);
}
.vrOpCompareLabel { color: #64748B; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
.vrOpCompareValue { color: #1E293B; font-size: 0.9375rem; font-weight: 600; }
.vrOpCompareDelta { font-size: 0.75rem; color: #E11D48; margin-left: 0.35rem; }

/* Semantic Status Pills (Background/Border/Text) */
.vrPillMatched      { background: #D1FAE5; color: #059669; border-color: #34D399; }
.vrPillMismatch     { background: #FFE4E6; color: #E11D48; border-color: #FB7185; }
.vrPillMissingS4    { background: #FFE4E6; color: #E11D48; border-color: #FB7185; }
.vrPillMissingFile  { background: #FFE4E6; color: #E11D48; border-color: #FB7185; }
.vrPillTolerance    { background: #FEF3C7; color: #D97706; border-color: #FBBF24; }
.vrPillDuplicate    { background: #E0E7FF; color: #4F46E5; border-color: #818CF8; }
.vrPillBlocked      { background: #F1F5F9; color: #475569; border-color: #CBD5E1; }

/* Vendor Invoice PDF viewer */
.vrInvoicePdfHost {
  width: 100%;
  height: 720px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 0.75rem;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}
.vrInvoicePdfHost iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
.vrInvoicePdfPlaceholder {
  width: 100%;
  color: #64748B;
  font-size: 0.875rem;
  text-align: center;
  align-self: center;
}
`;

fs.writeFileSync('app/vendordoclines/webapp/css/mohit_style.css', newCss);
console.log("CSS LIGHT APPLIED");
