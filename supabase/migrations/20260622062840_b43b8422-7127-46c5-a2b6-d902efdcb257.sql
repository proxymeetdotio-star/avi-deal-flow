
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS funding_amount numeric,
  ADD COLUMN IF NOT EXISTS funding_purpose text,
  ADD COLUMN IF NOT EXISTS use_of_funds_detail text,
  ADD COLUMN IF NOT EXISTS years_in_operation integer,
  ADD COLUMN IF NOT EXISTS existing_debt numeric,
  ADD COLUMN IF NOT EXISTS cashflow_strength text,
  ADD COLUMN IF NOT EXISTS readiness_score_100 integer,
  ADD COLUMN IF NOT EXISTS fundability_rating text;

ALTER TABLE public.mandates
  ADD COLUMN IF NOT EXISTS funding_purpose text,
  ADD COLUMN IF NOT EXISTS use_of_funds_detail text,
  ADD COLUMN IF NOT EXISTS years_in_operation integer,
  ADD COLUMN IF NOT EXISTS existing_debt numeric,
  ADD COLUMN IF NOT EXISTS cashflow_strength text,
  ADD COLUMN IF NOT EXISTS readiness_score_100 integer,
  ADD COLUMN IF NOT EXISTS fundability_rating text,
  ADD COLUMN IF NOT EXISTS doc_review jsonb,
  ADD COLUMN IF NOT EXISTS deal_memo jsonb;
