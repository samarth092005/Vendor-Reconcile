const fs = require('fs');

const newCss = `/* Vendor Reconciliation Dashboard - Dynamic Theme */

/* Layout wrappers */
.vrDashboardPage .sapMPageEnableScrolling { 
  background: var(--sapBackgroundColor); 
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.vrHeaderBar {
  background: var(--sapObjectHeader_Background);
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--sapObjectHeader_BorderColor);
}
.vrHeaderTitle { font-size: 1.375rem; font-weight: 600; color: var(--sapObjectHeader_TitleTextColor); }
.vrHeaderSubtitle { color: var(--sapObjectHeader_SubtitleTextColor); font-size: 0.8125rem; }

/* KPI card grid */
.vrKpiGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-gap: 0.75rem;
  padding: 0.75rem 1rem;
}
.vrKpiCard {
  background: var(--sapTile_Background);
  border: 1px solid var(--sapTile_BorderColor);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  min-height: 92px;
  box-shadow: var(--sapContent_Shadow0);
  transition: box-shadow .2s ease, transform .2s ease, background .2s ease;
  cursor: pointer;
}
.vrKpiCard:hover { 
  background: var(--sapTile_Hover_Background);
  box-shadow: var(--sapContent_Shadow1); 
  transform: translateY(-2px);
}
.vrKpiLabel {
  font-size: 0.75rem;
  color: var(--sapContent_LabelColor);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.vrKpiValue {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--sapTile_TitleTextColor);
  line-height: 1.15;
}
.vrKpiDelta {
  font-size: 0.75rem;
  margin-top: 0.35rem;
  font-weight: 600;
}

/* Semantic Status Colors (Deltas) */
.vrKpiDelta.up   { color: var(--sapPositiveColor); }
.vrKpiDelta.down { color: var(--sapNegativeColor); }
.vrKpiDelta.neutral { color: var(--sapNeutralColor); }
.vrKpiDelta.upBad   { color: var(--sapNegativeColor); } 
.vrKpiDelta.downGood { color: var(--sapPositiveColor); } 

.vrKpiCard.severity-good     { border-top: 3px solid var(--sapPositiveColor); }
.vrKpiCard.severity-warning  { border-top: 3px solid var(--sapCriticalColor); }
.vrKpiCard.severity-error    { border-top: 3px solid var(--sapNegativeColor); }
.vrKpiCard.severity-info     { border-top: 3px solid var(--sapInformationColor); }

/* Chart grid */
.vrChartGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  grid-gap: 0.75rem;
  padding: 0 1rem 0.75rem;
}
.vrChartCard {
  background: var(--sapTile_Background);
  border: 1px solid var(--sapTile_BorderColor);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: var(--sapContent_Shadow0);
}
.vrChartTitle {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--sapTile_TitleTextColor);
  margin-bottom: 0.75rem;
  display: block;
}

/* Result table container */
.vrTableCard {
  background: var(--sapList_Background);
  border: 1px solid var(--sapList_BorderColor);
  border-radius: 0.75rem;
  margin: 0 1rem 1rem;
  box-shadow: var(--sapContent_Shadow0);
}

/* Object page */
.vrOpHeader { background: var(--sapObjectHeader_Background); border-bottom: 1px solid var(--sapObjectHeader_BorderColor); }
.vrOpComparePanel {
  background: var(--sapGroup_ContentBackground);
  border: 1px solid var(--sapGroup_TitleBorderColor);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  box-shadow: var(--sapContent_Shadow0);
}
.vrOpCompareLabel { color: var(--sapContent_LabelColor); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
.vrOpCompareValue { color: var(--sapTextColor); font-size: 0.9375rem; font-weight: 600; }
.vrOpCompareDelta { font-size: 0.75rem; color: var(--sapNegativeColor); margin-left: 0.35rem; }

/* Vendor Invoice PDF viewer */
.vrInvoicePdfHost {
  width: 100%;
  height: 720px;
  background: var(--sapBackgroundColor);
  border: 1px solid var(--sapGroup_TitleBorderColor);
  border-radius: 0.75rem;
  overflow: hidden;
  display: flex;
}
`;

fs.writeFileSync('app/vendordoclines/webapp/css/mohit_style.css', newCss);
console.log("CSS VARS APPLIED");
