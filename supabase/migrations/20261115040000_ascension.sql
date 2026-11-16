-- ASCENSION: campo Clínica no lead (Planilha de Controle Geral) e checklists do Projeto Ascension.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS clinica text;
COMMENT ON COLUMN public.leads.clinica IS 'Clínica do atendimento (HOFF, ODONTO, CLINICA A, CLINICA B) — Planilha de Controle Geral';

CREATE TABLE IF NOT EXISTS public.ascension_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes date NOT NULL,                 -- primeiro dia do mês
  projeto text NOT NULL,             -- crc | comercial2 | avaliador | gestor
  item integer NOT NULL,             -- posição da tarefa no projeto (0, 1, 2…)
  dia integer NOT NULL CHECK (dia BETWEEN 1 AND 31),
  marcado boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mes, projeto, item, dia)
);
ALTER TABLE public.ascension_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "App open access" ON public.ascension_checklists FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.ascension_checklists;
