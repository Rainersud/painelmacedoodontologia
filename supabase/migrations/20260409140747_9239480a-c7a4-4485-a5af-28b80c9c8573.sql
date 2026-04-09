
-- Add return tracking fields to upsell_opportunities
ALTER TABLE public.upsell_opportunities
ADD COLUMN next_return_date date NULL,
ADD COLUMN last_stage_change_at timestamp with time zone NULL DEFAULT now(),
ADD COLUMN return_scheduled boolean NOT NULL DEFAULT false;
