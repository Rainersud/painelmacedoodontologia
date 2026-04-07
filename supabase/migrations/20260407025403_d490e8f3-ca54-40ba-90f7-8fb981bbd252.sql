
-- Add remarketing fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rmkt_entered_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rmkt_status text NOT NULL DEFAULT 'inativo';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rmkt_origin_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rmkt_last_stage text;

-- Create remarketing_entries table for tracking lead position in RMKT funnel
CREATE TABLE public.remarketing_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_stage text NOT NULL DEFAULT 'dia_1',
  phase text NOT NULL DEFAULT 'aquecimento',
  entered_at timestamptz NOT NULL DEFAULT now(),
  last_advanced_at timestamptz,
  origin_status text,
  is_active boolean NOT NULL DEFAULT true,
  return_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create remarketing_logs table for automation history
CREATE TABLE public.remarketing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_stage text,
  to_stage text,
  triggered_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for remarketing_entries
ALTER TABLE public.remarketing_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view remarketing entries" ON public.remarketing_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert remarketing entries" ON public.remarketing_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update remarketing entries" ON public.remarketing_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete remarketing entries" ON public.remarketing_entries FOR DELETE TO authenticated USING (true);

-- RLS for remarketing_logs
ALTER TABLE public.remarketing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view remarketing logs" ON public.remarketing_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert remarketing logs" ON public.remarketing_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.remarketing_entries;

-- Updated_at trigger for remarketing_entries
CREATE TRIGGER update_remarketing_entries_updated_at BEFORE UPDATE ON public.remarketing_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
