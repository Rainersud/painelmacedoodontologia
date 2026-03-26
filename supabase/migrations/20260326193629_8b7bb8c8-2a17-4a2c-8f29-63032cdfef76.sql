ALTER TABLE public.patient_triage 
ADD COLUMN IF NOT EXISTS credit_pagmais_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_capim_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_maioral_value numeric DEFAULT 0;