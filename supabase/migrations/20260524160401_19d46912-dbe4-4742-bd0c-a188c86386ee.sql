
-- 1) Enum lead_arrival_source
DO $$ BEGIN
  CREATE TYPE public.lead_arrival_source AS ENUM (
    'facebook','instagram','google','passou_na_frente',
    'indicacao_pac','prospeccao_ativa','indicacao_parceria','social_selling'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Coluna em leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_arrival_source public.lead_arrival_source NOT NULL DEFAULT 'passou_na_frente';

-- 3) Seed/atualização das metas oficiais (idempotente)
INSERT INTO public.meta_settings (setting_key, setting_value, description) VALUES
  ('meta_novos_leads_mes', 300, 'Meta mensal de novos leads'),
  ('meta_agendamentos_mes', 135, 'Meta mensal de agendamentos'),
  ('meta_comparecimentos_mes', 95, 'Meta mensal de comparecimentos'),
  ('meta_vendas_mes', 20, 'Meta mensal de vendas realizadas'),
  ('meta_ticket_medio', 6000, 'Meta de ticket médio (R$)'),
  ('meta_faturamento_mes', 120000, 'Meta mensal de faturamento (R$)'),
  ('meta_investimento_trafego_mes', 6000, 'Meta mensal de investimento em tráfego (R$)'),
  ('meta_taxa_agendamento', 45, 'Taxa saudável de agendamento (%)'),
  ('meta_taxa_comparecimento', 70, 'Taxa saudável de comparecimento (%)'),
  ('meta_taxa_fechamento', 21, 'Taxa saudável de fechamento (%)'),
  ('meta_cpl', 20, 'CPL saudável (R$)'),
  ('meta_cac', 300, 'CAC saudável (R$)'),
  ('meta_roi_liquido', 8, 'ROI líquido saudável (x)'),
  ('meta_roas_bruto', 20, 'ROAS bruto saudável (x)'),
  ('meta_dias_uteis_mes', 20, 'Base de dias úteis no mês para proporcionalidade')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();
