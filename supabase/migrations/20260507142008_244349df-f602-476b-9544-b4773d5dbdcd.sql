
-- Create storage bucket for copy attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('copy-attachments', 'copy-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public can view copy attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'copy-attachments');

CREATE POLICY "Authenticated can upload copy attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'copy-attachments');

CREATE POLICY "Authenticated can delete copy attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'copy-attachments');

-- Metadata table
CREATE TABLE public.copy_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_copy_attachments_stage ON public.copy_attachments(stage_key);

ALTER TABLE public.copy_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view copy attachments"
ON public.copy_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert copy attachments"
ON public.copy_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete copy attachments"
ON public.copy_attachments FOR DELETE TO authenticated USING (true);
