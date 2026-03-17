
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS response text,
  ADD COLUMN IF NOT EXISTS reschedule_reason text,
  ADD COLUMN IF NOT EXISTS rescheduled_from_id uuid REFERENCES public.tasks(id);
