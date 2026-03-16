
ALTER TABLE public.patient_triage 
  ADD COLUMN credit_status TEXT DEFAULT 'pendente',
  ADD COLUMN credit_approved_value NUMERIC DEFAULT 0;
