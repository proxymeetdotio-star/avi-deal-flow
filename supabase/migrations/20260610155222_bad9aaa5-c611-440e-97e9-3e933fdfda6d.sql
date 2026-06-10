
-- Lock down has_role execution to authenticated only (used by RLS, runs as definer)
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- Fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Replace permissive insert policy with explicit field validation
DROP POLICY "anyone can submit lead" ON public.leads;
CREATE POLICY "anyone can submit lead" ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  length(full_name) > 0
  AND length(company_name) > 0
  AND length(email) > 3
  AND length(phone) > 0
  AND length(capital_sought) > 0
);
