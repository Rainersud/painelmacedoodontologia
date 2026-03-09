
-- Add new lead_status enum values
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'qualificado';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'tratamento_andamento';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'concluido';

-- Add stage_entered_at column to track time in current stage
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT now();

-- Update existing leads to have stage_entered_at set to updated_at
UPDATE public.leads SET stage_entered_at = updated_at WHERE stage_entered_at IS NULL;
