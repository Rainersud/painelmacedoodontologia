-- Add em_contato to lead_status enum
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'em_contato';

-- Add contact_attempts column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_attempts integer NOT NULL DEFAULT 0;