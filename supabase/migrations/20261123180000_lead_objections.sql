-- Objeções registradas pela CRC (Tarefas CRC → Fechamento do dia); aparecem na Análise de Perdas
CREATE TABLE IF NOT EXISTS public.lead_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_name text,
  categoria text NOT NULL,
  detalhe text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_objections_created_at_idx ON public.lead_objections (created_at);
ALTER TABLE public.lead_objections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "App open access" ON public.lead_objections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_actor BEFORE INSERT ON public.lead_objections FOR EACH ROW EXECUTE FUNCTION public.fill_actor('created_by');
