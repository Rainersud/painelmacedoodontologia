-- Drop FKs to auth.users on operational columns
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_agent_id_fkey;
ALTER TABLE public.lead_interactions DROP CONSTRAINT IF EXISTS lead_interactions_user_id_fkey;
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_created_by_fkey;
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_agent_id_fkey;
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;

-- Make actor columns nullable
ALTER TABLE public.tasks ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.activity_logs ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.patient_triage ALTER COLUMN filled_by DROP NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.lead_interactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.call_logs ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.upsell_contact_history ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.agent_daily_metrics ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.meeting_annotations ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.acquisition_costs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.ad_creatives ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.goals ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.incentive_plans ALTER COLUMN created_by DROP NOT NULL;