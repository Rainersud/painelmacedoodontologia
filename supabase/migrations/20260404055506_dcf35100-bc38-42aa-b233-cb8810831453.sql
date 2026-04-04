
ALTER TABLE public.upsell_opportunities 
  ADD COLUMN friendly_patient boolean NOT NULL DEFAULT false,
  ADD COLUMN friendly_patient_video_recorded boolean NOT NULL DEFAULT false,
  ADD COLUMN friendly_patient_video_recorded_at timestamptz DEFAULT NULL;
