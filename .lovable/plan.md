## Current outcome (for context)

Today the sponsor goes through 3 steps: Inputs → Your Details → Report. The report already shows:
- Funding Readiness score (1–10)
- Investor Attractiveness score (1–10)
- Executive Summary, Capital Structure Recommendation, Key Risks, Next Steps, optional Sharia note
- "Download Branded PDF"
There is no funding-purpose dropdown, no 0–100 rating, no instrument suitability list, no doc-completeness section, and no internal deal memo. Document upload + review only exists later, inside `/admin/mandates/$id` after a lead is converted.

## What changes

Business model, workflow, fee structure unchanged. SME → Assessment → Matching → Introduction → Success Fee.

### 1. Assessment form (all three: SME, Real Estate, Sharia Compliance)
Replace the single "Capital required" / "Capital sought" with three fields:
- **Funding Amount Required** (USD)
- **Funding Purpose** — dropdown of the 15 options listed (Working Capital, Trade Finance, Inventory Purchase, Import Financing, Export Financing, Equipment Purchase, Asset Finance, Expansion, Acquisition, Project Finance, Real Estate, Construction Finance, Bridge Funding, Debt Refinancing, Equity Capital)
- **Detailed Explanation of Use of Funds** (textarea)

Also add light fields needed for the 0–100 score (only ones not already captured):
- Years in Operation
- Existing Debt (USD)
- Cashflow Strength (Strong / Adequate / Weak / Unknown)

### 2. AI report (sponsor-facing) — upgraded
Server function `generateAssessmentReport` rewritten to return:
- **Funding Readiness Score (0–100)** + **Fundability Rating** (High ≥75 / Medium 50–74 / Low <50), with a short breakdown of the 6 drivers (Revenue, Years in Operation, Financial Statements, Existing Debt, Cashflow, Documentation Completeness)
- **Recommended Financing Structure**
  - Funding Requirement (echo)
  - Recommended Instruments (ranked)
  - Less Suitable Instruments
  - Explanation
- Existing sections retained: Executive Summary, Key Risks, Suggested Next Steps, Sharia Assessment (when applicable)
- "Investor Attractiveness (1–10)" is removed — superseded by the 0–100 score
- Strict no-assumptions rule preserved

The report is rendered on screen and in the branded PDF. Sponsor sees readiness + financing recommendations as you requested.

### 3. Document Completeness Review (admin-only, post-conversion)
Stays in the existing mandate documents flow. Add a new admin action on `/admin/mandates/$id` → **"Run Document Completeness Review"** which calls a new server fn `reviewMandateDocuments({ mandateId })`. Uses already-analyzed `mandate_documents.analysis` plus the mandate's deal_type / asset_class / sharia_status to return:
- Missing Documents
- Outdated Documents
- Recommended Additional Information

Result stored on `mandates.doc_review` (jsonb) and shown in a new "Doc Review" panel on the Documents tab.

### 4. AI Deal Summary (internal investment memo, admin-only)
New admin action on `/admin/mandates/$id` → **"Generate Deal Memo"**, server fn `generateDealMemo({ mandateId })`, returns:
- Company Overview
- Funding Requirement
- Use of Funds
- Key Strengths
- Key Risks
- Recommended Financing Products
- Recommended Financier Types (no specific financiers yet — matching deferred)
Stored on `mandates.deal_memo` (jsonb), rendered in a new "Deal Memo" tab, downloadable as PDF via existing brand util.

### 5. Financier Match Score
**Deferred per your answer.** No financiers table, no matching UI in this pass. We'll add it as a follow-up once the financier database is defined.

## Technical details

**DB migration**
- `leads`: add `funding_amount` numeric, `funding_purpose` text, `use_of_funds_detail` text, `years_in_operation` int, `existing_debt` numeric, `cashflow_strength` text, `readiness_score_100` int, `fundability_rating` text (High/Medium/Low). Keep existing `capital_sought` for backward compatibility.
- `mandates`: add `funding_purpose` text, `use_of_funds_detail` text, `years_in_operation` int, `existing_debt` numeric, `cashflow_strength` text, `readiness_score_100` int, `fundability_rating` text, `doc_review` jsonb, `deal_memo` jsonb.
- GRANTs + RLS preserved (admin-only on mandates; existing lead policies unchanged).
- "Convert to Mandate" carries the new fields over.

**Server functions** (`src/lib/`)
- `ai.functions.ts` — rewrite `generateAssessmentReport` schema; new `AssessmentReport` type with `readiness_score_100`, `fundability_rating`, `score_breakdown`, `recommended_instruments[]`, `less_suitable_instruments[]`, `financing_explanation`. Uses `google/gemini-2.5-pro` with strict JSON schema and the same no-assumptions system prompt.
- `mandate-review.functions.ts` (new) — `reviewMandateDocuments` and `generateDealMemo`, both `.middleware([requireSupabaseAuth])` + admin check via `has_role`.

**UI**
- `src/routes/assessment.$slug.tsx` — new fields in `FormStep` + `LeadStep`; `ReportStep` renders the 0–100 score with rating chip, financing recommendation block, score-driver breakdown.
- `src/lib/pdf.ts` — extend PDF template with the new sections.
- `src/routes/_authenticated/mandates.$id.tsx` — add Doc Review panel + Deal Memo tab + buttons.

**Out of scope this pass**
- Financiers table + match scoring (deferred until you have the financier list).
- Changes to existing mandate deal-package generators.
- Sponsor-facing doc upload (review stays at mandate stage as you confirmed).

Approve and I'll start with the migration.
