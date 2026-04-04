
-- Add personalization fields to patient_triage
ALTER TABLE public.patient_triage ADD COLUMN IF NOT EXISTS ice_cream_flavor text DEFAULT NULL;
ALTER TABLE public.patient_triage ADD COLUMN IF NOT EXISTS post_treatment_food text DEFAULT NULL;

-- Add two-gift system to upsell_opportunities
ALTER TABLE public.upsell_opportunities ADD COLUMN IF NOT EXISTS gift_surgery_sent boolean NOT NULL DEFAULT false;
ALTER TABLE public.upsell_opportunities ADD COLUMN IF NOT EXISTS gift_surgery_sent_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.upsell_opportunities ADD COLUMN IF NOT EXISTS gift_surgery_date date DEFAULT NULL;
ALTER TABLE public.upsell_opportunities ADD COLUMN IF NOT EXISTS gift_prosthesis_sent boolean NOT NULL DEFAULT false;
ALTER TABLE public.upsell_opportunities ADD COLUMN IF NOT EXISTS gift_prosthesis_sent_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.upsell_opportunities ADD COLUMN IF NOT EXISTS gift_prosthesis_date date DEFAULT NULL;
