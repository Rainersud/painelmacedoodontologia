
-- Add new enum values to lead_status
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'quase_cliente';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'potencial';

-- Add loss_reason column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason text DEFAULT NULL;
