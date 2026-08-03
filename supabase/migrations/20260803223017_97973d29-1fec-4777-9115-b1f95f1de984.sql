CREATE POLICY "loss attachments open read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'loss-attachments');
CREATE POLICY "loss attachments open insert" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'loss-attachments');
CREATE POLICY "loss attachments open update" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'loss-attachments') WITH CHECK (bucket_id = 'loss-attachments');
CREATE POLICY "loss attachments open delete" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'loss-attachments');