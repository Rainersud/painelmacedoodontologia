
-- Table for upsell opportunities (Comercial 2 pipeline)
CREATE TABLE public.upsell_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID,
  status TEXT NOT NULL DEFAULT 'base_pacientes',
  suggested_treatment TEXT NOT NULL,
  treatment_category TEXT DEFAULT 'geral',
  contact_status TEXT NOT NULL DEFAULT 'nao_contatado',
  notes TEXT,
  estimated_value NUMERIC DEFAULT 0,
  closed_value NUMERIC DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE,
  next_contact_at TIMESTAMP WITH TIME ZONE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for configurable treatment suggestions
CREATE TABLE public.upsell_treatment_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_treatment TEXT NOT NULL,
  suggested_treatment TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  priority INTEGER NOT NULL DEFAULT 0,
  delay_months INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for upsell contact history
CREATE TABLE public.upsell_contact_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.upsell_opportunities(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  contact_type TEXT NOT NULL DEFAULT 'ligacao',
  result TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for upsell_opportunities
ALTER TABLE public.upsell_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view upsell opportunities"
  ON public.upsell_opportunities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert upsell opportunities"
  ON public.upsell_opportunities FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update upsell opportunities"
  ON public.upsell_opportunities FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admins can delete upsell opportunities"
  ON public.upsell_opportunities FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- RLS for upsell_treatment_suggestions
ALTER TABLE public.upsell_treatment_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view treatment suggestions"
  ON public.upsell_treatment_suggestions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert treatment suggestions"
  ON public.upsell_treatment_suggestions FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update treatment suggestions"
  ON public.upsell_treatment_suggestions FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete treatment suggestions"
  ON public.upsell_treatment_suggestions FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- RLS for upsell_contact_history
ALTER TABLE public.upsell_contact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contact history"
  ON public.upsell_contact_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contact history"
  ON public.upsell_contact_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- Insert default treatment suggestions
INSERT INTO public.upsell_treatment_suggestions (trigger_treatment, suggested_treatment, category, priority, delay_months) VALUES
  ('protese_total', 'Implantes', 'upgrade', 1, 0),
  ('protese_total', 'Protocolo', 'upgrade', 2, 0),
  ('protese_total', 'Limpeza Profissional', 'manutencao', 3, 6),
  ('protese_flexivel', 'Implantes', 'upgrade', 1, 0),
  ('protese_flexivel', 'Protocolo', 'upgrade', 2, 0),
  ('protese_flexivel', 'Limpeza Profissional', 'manutencao', 3, 6),
  ('implante', 'Revisão Semestral', 'manutencao', 1, 6),
  ('implante', 'Profilaxia', 'manutencao', 2, 6),
  ('implante', 'Ajuste de Prótese', 'manutencao', 3, 12),
  ('implante', 'Clareamento Dental', 'estetica', 4, 3),
  ('implante', 'Lentes de Contato Dental', 'estetica', 5, 3),
  ('implante', 'Troca de Prótese Antiga', 'upgrade', 6, 24),
  ('implante', 'Benefícios para Familiares', 'indicacao', 7, 0);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.upsell_opportunities;
