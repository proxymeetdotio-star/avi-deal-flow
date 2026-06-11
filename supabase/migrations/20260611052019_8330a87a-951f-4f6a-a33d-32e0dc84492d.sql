
-- Enums
CREATE TYPE public.mandate_stage AS ENUM ('Draft','Under Review','Ready to Package','Live','Closed','Archived');
CREATE TYPE public.sharia_status AS ENUM ('Required','Not Required','Pending');
CREATE TYPE public.mandate_doc_type AS ENUM ('Pitch Deck','Financials','Trade License','Title Deed','Valuation','KYC','Other');
CREATE TYPE public.generated_doc_kind AS ENUM ('Teaser','Information Memorandum','Investor Deck','Financial Model Summary','Term Sheet','Risk Memo','Process Letter','Debt Structure Memo','Covenant Pack','Sharia Compliance Memo');
CREATE TYPE public.generated_doc_format AS ENUM ('pdf','docx','pptx');

-- mandates
CREATE TABLE public.mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  sponsor_name text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  deal_type public.deal_type NOT NULL,
  asset_class text,
  geography text,
  capital_sought text NOT NULL,
  use_of_proceeds text,
  sponsor_track_record text,
  financial_summary text,
  sharia_status public.sharia_status NOT NULL DEFAULT 'Pending',
  stage public.mandate_stage NOT NULL DEFAULT 'Draft',
  archived_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mandates TO authenticated;
GRANT ALL ON public.mandates TO service_role;
ALTER TABLE public.mandates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read mandates" ON public.mandates FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert mandates" ON public.mandates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update mandates" ON public.mandates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete mandates" ON public.mandates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER mandates_touch BEFORE UPDATE ON public.mandates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- mandate_documents
CREATE TABLE public.mandate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text,
  doc_type public.mandate_doc_type NOT NULL DEFAULT 'Other',
  analysis jsonb,
  analyzed_at timestamptz,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mandate_documents TO authenticated;
GRANT ALL ON public.mandate_documents TO service_role;
ALTER TABLE public.mandate_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all mandate_documents" ON public.mandate_documents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX mandate_documents_mandate_idx ON public.mandate_documents(mandate_id);

-- enforce max 20 docs per mandate
CREATE OR REPLACE FUNCTION public.enforce_mandate_doc_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.mandate_documents WHERE mandate_id = NEW.mandate_id) >= 20 THEN
    RAISE EXCEPTION 'Maximum 20 documents per mandate reached';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER mandate_doc_limit BEFORE INSERT ON public.mandate_documents FOR EACH ROW EXECUTE FUNCTION public.enforce_mandate_doc_limit();

-- mandate_generated_documents
CREATE TABLE public.mandate_generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  doc_kind public.generated_doc_kind NOT NULL,
  format public.generated_doc_format NOT NULL,
  storage_path text,
  content jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mandate_generated_documents TO authenticated;
GRANT ALL ON public.mandate_generated_documents TO service_role;
ALTER TABLE public.mandate_generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all generated docs" ON public.mandate_generated_documents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX gen_docs_mandate_idx ON public.mandate_generated_documents(mandate_id);

-- storage object RLS (admin-only on mandate-files bucket)
CREATE POLICY "admins read mandate-files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mandate-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert mandate-files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mandate-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update mandate-files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mandate-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete mandate-files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mandate-files' AND public.has_role(auth.uid(),'admin'));
