CREATE TABLE public.lead_loss_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_loss_attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_loss_attachments TO authenticated;
GRANT ALL ON public.lead_loss_attachments TO service_role;

ALTER TABLE public.lead_loss_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App open access" ON public.lead_loss_attachments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_lead_loss_attachments_lead ON public.lead_loss_attachments(lead_id);