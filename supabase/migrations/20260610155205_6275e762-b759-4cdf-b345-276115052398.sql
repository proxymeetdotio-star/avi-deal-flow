
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Assessments / Leads
CREATE TYPE public.assessment_type AS ENUM (
  'real_estate_capital_readiness',
  'sme_funding_readiness',
  'investor_suitability',
  'sharia_compliance'
);

CREATE TYPE public.deal_type AS ENUM ('Equity','Debt');

CREATE TYPE public.lead_status AS ENUM ('New','Contacted','Converted to Mandate','Not Qualified');

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type assessment_type NOT NULL,
  -- lead capture
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  capital_sought TEXT NOT NULL,
  deal_type deal_type NOT NULL,
  -- assessment inputs (free-form JSON)
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- AI output
  funding_readiness_score INTEGER,
  investor_attractiveness_score INTEGER,
  report JSONB,
  -- admin
  status lead_status NOT NULL DEFAULT 'New',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Public can insert leads (assessment submission)
CREATE POLICY "anyone can submit lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Admins can read/update all
CREATE POLICY "admins read leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update leads" ON public.leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER leads_touch BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
