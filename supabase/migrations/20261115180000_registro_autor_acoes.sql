-- Quem fez cada ação: completa o autor com o usuário logado quando a tela não informa
CREATE OR REPLACE FUNCTION public.fill_actor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE col text := TG_ARGV[0];
BEGIN
  IF auth.uid() IS NOT NULL AND (to_jsonb(NEW) ->> col) IS NULL THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object(col, auth.uid()));
  END IF;
  RETURN NEW;
END; $$;

ALTER TABLE public.lead_stage_history ADD COLUMN IF NOT EXISTS changed_by uuid;

DROP TRIGGER IF EXISTS trg_actor ON public.activity_logs;
CREATE TRIGGER trg_actor BEFORE INSERT ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.fill_actor('agent_id');
DROP TRIGGER IF EXISTS trg_actor ON public.lead_interactions;
CREATE TRIGGER trg_actor BEFORE INSERT ON public.lead_interactions FOR EACH ROW EXECUTE FUNCTION public.fill_actor('user_id');
DROP TRIGGER IF EXISTS trg_actor ON public.crc_entries;
CREATE TRIGGER trg_actor BEFORE INSERT ON public.crc_entries FOR EACH ROW EXECUTE FUNCTION public.fill_actor('created_by');
DROP TRIGGER IF EXISTS trg_actor ON public.tasks;
CREATE TRIGGER trg_actor BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.fill_actor('agent_id');
DROP TRIGGER IF EXISTS trg_actor ON public.appointments;
CREATE TRIGGER trg_actor BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.fill_actor('agent_id');
DROP TRIGGER IF EXISTS trg_actor ON public.payments;
CREATE TRIGGER trg_actor BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.fill_actor('agent_id');
DROP TRIGGER IF EXISTS trg_actor ON public.lead_stage_history;
CREATE TRIGGER trg_actor BEFORE INSERT ON public.lead_stage_history FOR EACH ROW EXECUTE FUNCTION public.fill_actor('changed_by');
DROP TRIGGER IF EXISTS trg_actor ON public.patient_triage;
CREATE TRIGGER trg_actor BEFORE INSERT OR UPDATE ON public.patient_triage FOR EACH ROW EXECUTE FUNCTION public.fill_actor('filled_by');
