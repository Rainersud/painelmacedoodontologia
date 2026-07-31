-- 1) Least privilege: revoke anon access from every public table
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;
REVOKE USAGE ON SCHEMA public FROM anon;

-- 2) Storage: authenticated-only read policy for copy-attachments
DROP POLICY IF EXISTS "Authenticated can read copy attachments" ON storage.objects;
CREATE POLICY "Authenticated can read copy attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'copy-attachments');

-- 3) Foreign-key / hot-path indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_lead_id ON public.activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_agent_created ON public.activity_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_lead_id ON public.alerts(lead_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_read ON public.alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_by ON public.goals(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_user_id ON public.lead_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead_id ON public.lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_plans_meeting_id ON public.meeting_action_plans(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_annotations_meeting_id ON public.meeting_annotations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_training_links_meeting_id ON public.meeting_training_links(meeting_id);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON public.payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent_payment_id ON public.payments(parent_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_upsell_opportunity_id ON public.payments(upsell_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_due ON public.payments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_lead_id ON public.referrals(referred_lead_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_lead_id ON public.referrals(referrer_lead_id);
CREATE INDEX IF NOT EXISTS idx_remarketing_entries_lead_id ON public.remarketing_entries(lead_id);
CREATE INDEX IF NOT EXISTS idx_remarketing_logs_lead_id ON public.remarketing_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_rescheduled_from_id ON public.tasks(rescheduled_from_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_status_sched ON public.tasks(agent_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_triage_referrals_triage_id ON public.triage_referrals(triage_id);
CREATE INDEX IF NOT EXISTS idx_triage_referrals_lead_id ON public.triage_referrals(lead_id);
CREATE INDEX IF NOT EXISTS idx_triage_referrals_converted_lead_id ON public.triage_referrals(converted_lead_id);
CREATE INDEX IF NOT EXISTS idx_upsell_contact_history_opportunity_id ON public.upsell_contact_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_upsell_opportunities_lead_id ON public.upsell_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id ON public.whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_patient_triage_lead_id ON public.patient_triage(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_agent_status ON public.leads(assigned_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_closed_at ON public.leads(closed_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);