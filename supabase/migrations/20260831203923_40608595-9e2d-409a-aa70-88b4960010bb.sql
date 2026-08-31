CREATE TABLE public.task_reschedule_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  agent_id uuid,
  previous_scheduled_at timestamp with time zone,
  new_scheduled_at timestamp with time zone NOT NULL,
  reason text NOT NULL,
  observation text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_reschedule_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_reschedule_history TO anon;
GRANT ALL ON public.task_reschedule_history TO service_role;

ALTER TABLE public.task_reschedule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App open access - task_reschedule_history"
ON public.task_reschedule_history
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_task_reschedule_history_task ON public.task_reschedule_history(task_id, created_at);