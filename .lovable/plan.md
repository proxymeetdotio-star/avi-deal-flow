## Module 2 — Mandate Creation

### Database
- `mandates` table: `lead_id` (FK, nullable), `sponsor_name`, `company_name`, `email`, `phone`, `deal_type` (Equity/Debt), `asset_class`, `geography`, `capital_sought`, `use_of_proceeds`, `sponsor_track_record`, `financial_summary`, `sharia_status` (Required / Not Required / Pending), `stage` (Draft / Under Review / Ready to Package / Live / Closed / Archived), `archived_at`, `notes`, admin-only RLS.
- `mandate_documents` table: uploaded files — `mandate_id`, `storage_path`, `file_name`, `file_size`, `doc_type` (Pitch Deck / Financials / Trade License / Title Deed / Valuation / KYC / Other), `analysis` (jsonb), `analyzed_at`. Max 20 enforced in UI + trigger.
- `mandate_generated_documents` table: AI outputs — `mandate_id`, `doc_kind` (Teaser / Info Memo / Financial Model Summary / Investor Deck / Term Sheet / Risk Memo / Sharia Memo / Debt Structure Memo / Covenant Pack / etc.), `format` (pdf/docx/pptx), `storage_path`, `content` (jsonb structured), `generated_at`.
- Private storage bucket `mandate-files` with admin-only RLS on `storage.objects`.

### Admin UI
- **Leads dashboard**: add "Convert to Mandate" action on each lead → creates draft mandate prefilled from lead + report, navigates to detail.
- **`/admin/mandates`**: list with stage filter, search, archive toggle.
- **`/admin/mandates/$id`**: tabbed detail view
  - *Overview*: editable mandate fields, stage selector, sharia status, archive button.
  - *Documents*: drag-drop uploader (max 20, type labels), per-file "Analyze with AI" → extracts summary/key terms/red flags into `analysis`.
  - *Generated Package*: "Generate Deal Package" button → produces 7 docs for Equity / 8 for Debt (Sharia memo added conditionally). Each item shows status + download buttons (PDF/DOCX/PPTX).
  - *Activity*: notes + status history.

### AI Server Functions
- `analyzeMandateDocument({ documentId })` — Gemini Pro with file input; returns `{ summary, key_terms, financials_extracted, red_flags, missing_info }`. **No-assumptions rule** baked into system prompt: "Do not infer numbers, names, or terms not present in the source. Mark unknowns as `null` and list under `missing_info`."
- `generateMandatePackage({ mandateId })` — orchestrator that, for each required doc kind, calls Gemini with mandate data + analyzed docs, returns structured JSON. Caller then renders to:
  - **PDF** via `jspdf` (already installed) with Avi letterhead/footer/disclaimer
  - **DOCX** via `docx` npm package
  - **PPTX** via `pptxgenjs` for the Investor Deck
  - Files uploaded to `mandate-files/generated/{mandateId}/{kind}.{ext}`

### Deal Package matrix
- **Equity (7)**: Teaser, Information Memorandum, Investor Deck (PPTX), Financial Model Summary, Term Sheet, Risk Memo, Process Letter.
- **Debt (8)**: Teaser, Information Memorandum, Investor Deck (PPTX), Financial Model Summary, Term Sheet, Risk Memo, Debt Structure Memo, Covenant Pack.
- **+ Sharia Compliance Memo** appended when `sharia_status = Required`.

### Branding
- Shared `aviBrand` util providing letterhead header, footer ("Prepared by Avi — Regulated by the DFSA via Index & Cie"), disclaimer, color tokens. Applied uniformly across PDF/DOCX/PPTX generators.

### Sequencing
1. Migration (tables + bucket + RLS).
2. Storage bucket via tool.
3. Mandate CRUD server fns + admin list/detail UI + Convert-to-Mandate action.
4. Document upload + analysis fn + UI.
5. Generators (PDF/DOCX/PPTX) + orchestrator fn + UI.
6. Smoke test end-to-end as admin.

### Out of scope for v1
- Investor outreach, deal rooms, LOI workflow (later modules).
- Sponsor self-serve (admin-only).
- Realtime collaboration on a mandate.

Approve and I'll start with the migration.