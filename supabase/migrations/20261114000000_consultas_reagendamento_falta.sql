-- Consultas passam a registrar reagendamento e falta, e o histórico de etapas preenche o passado.
-- Até aqui o painel mudava o status do lead mas nunca marcava a consulta (attended_at,
-- confirmed_at e cancelled_at estavam vazios em todas), e reagendar movia a mesma consulta.

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rescheduled_from_id uuid
  REFERENCES public.appointments(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS no_show_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_appointments_lead_sched ON public.appointments (lead_id, scheduled_at DESC);

-- Preenche o passado a partir do histórico de etapas: para cada entrada em Confirmado,
-- Compareceu ou Faltou, marca a consulta do lead que estava valendo naquele momento
-- (a mais recente criada até ali). Só preenche campos vazios.
WITH ev AS (
  SELECT h.lead_id, h.stage, h.entered_at,
         (SELECT a.id FROM public.appointments a
           WHERE a.lead_id = h.lead_id AND a.created_at <= h.entered_at + interval '1 minute'
           ORDER BY a.created_at DESC LIMIT 1) AS appt_id
  FROM public.lead_stage_history h
  WHERE h.stage IN ('confirmado', 'compareceu', 'faltou', 'nao_compareceu')
)
UPDATE public.appointments a SET
  confirmed_at = COALESCE(a.confirmed_at, (SELECT min(e.entered_at) FROM ev e WHERE e.appt_id = a.id AND e.stage = 'confirmado')),
  attended_at  = COALESCE(a.attended_at,  (SELECT min(e.entered_at) FROM ev e WHERE e.appt_id = a.id AND e.stage = 'compareceu')),
  no_show_at   = COALESCE(a.no_show_at,   (SELECT min(e.entered_at) FROM ev e WHERE e.appt_id = a.id AND e.stage IN ('faltou', 'nao_compareceu')))
WHERE a.id IN (SELECT appt_id FROM ev WHERE appt_id IS NOT NULL);

-- Leads que foram para Compareceu/Faltou sem ter passado por "Agendado" no painel ficaram sem
-- consulta: cria a consulta que aconteceu (ou faltou), na data em que a etapa foi registrada.
INSERT INTO public.appointments (lead_id, agent_id, scheduled_at, created_at, attended_at, no_show_at, notes)
SELECT h.lead_id, l.assigned_agent_id, h.entered_at, h.entered_at,
       CASE WHEN h.stage = 'compareceu' THEN h.entered_at END,
       CASE WHEN h.stage IN ('faltou', 'nao_compareceu') THEN h.entered_at END,
       'Registrada a partir do histórico de etapas'
FROM public.lead_stage_history h
JOIN public.leads l ON l.id = h.lead_id
WHERE h.stage IN ('compareceu', 'faltou', 'nao_compareceu')
  AND NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.lead_id = h.lead_id AND a.created_at <= h.entered_at + interval '1 minute'
  );
