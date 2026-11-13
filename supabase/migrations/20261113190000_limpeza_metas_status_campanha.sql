-- Limpeza de 13/11/2026 (após sair do Lovable).

-- 1) Campanha de origem do lead (texto livre; casa com o Funil de Tráfego pelo nome)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_campaign_len;
ALTER TABLE public.leads ADD CONSTRAINT leads_campaign_len CHECK (campaign IS NULL OR char_length(campaign) <= 120);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON public.leads (lower(campaign)) WHERE campaign IS NOT NULL;

-- 2) "consulta_agendada" é o nome antigo de "agendou": o banco converte sozinho
--    (nenhum lead usava mais o nome antigo; isso só impede que ele volte).
CREATE OR REPLACE FUNCTION public.normalize_lead_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status::text = 'consulta_agendada' THEN
    NEW.status := 'agendou';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_normalize_lead_status ON public.leads;
CREATE TRIGGER trg_normalize_lead_status
  BEFORE INSERT OR UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.normalize_lead_status();
UPDATE public.leads SET status = 'agendou' WHERE status::text = 'consulta_agendada';
UPDATE public.lead_stage_history SET stage = 'agendou' WHERE stage = 'consulta_agendada';

-- 3) Metas: uma chave por meta (a que a tela "Metas da Clínica" grava).
--    Removidas as cópias e as chaves que nenhuma tela lê. Valores no momento da remoção:
--    meta_novos_leads_mes=300 (=meta_leads), meta_agendamentos_mes=135, meta_comparecimentos_mes=95,
--    meta_vendas_mes=20 (=meta_fechamentos), meta_faturamento_mes=120000,
--    meta_investimento_trafego_mes=6000 (=investimento_marketing), meta_taxa_agendamento=45,
--    meta_taxa_comparecimento=70, meta_taxa_fechamento=21 (=taxa_*), meta_roi_liquido=8 (=meta_roi);
--    sem uso: daily_*, healthy_*, monthly_revenue_target=100000, investment=10000,
--    bonus_appointments/attendance/closed/rescued (os bônus usam bonus_<tipo>_target/_value),
--    meta_*_diario, meta_*_semanal, incentive_tier_*.
DELETE FROM public.meta_settings WHERE setting_key IN (
  'meta_novos_leads_mes', 'meta_agendamentos_mes', 'meta_comparecimentos_mes', 'meta_vendas_mes',
  'meta_faturamento_mes', 'meta_investimento_trafego_mes',
  'meta_taxa_agendamento', 'meta_taxa_comparecimento', 'meta_taxa_fechamento', 'meta_roi_liquido',
  'daily_appointments_target', 'daily_attendance_target', 'daily_closed_target', 'daily_leads_target', 'daily_rescued_target',
  'healthy_appointment_rate', 'healthy_attendance_rate', 'healthy_closing_rate',
  'monthly_revenue_target', 'investment',
  'bonus_appointments', 'bonus_attendance', 'bonus_closed', 'bonus_rescued',
  'meta_agendamentos_diario', 'meta_comparecimentos_diario', 'meta_fechamentos_diario', 'meta_leads_diario',
  'meta_agendamentos_semanal', 'meta_comparecimentos_semanal', 'meta_fechamentos_semanal', 'meta_leads_semanal',
  'incentive_tier_1_percentage', 'incentive_tier_1_target', 'incentive_tier_2_percentage', 'incentive_tier_2_target',
  'incentive_tier_3_percentage', 'incentive_tier_3_target', 'incentive_tier_4_percentage', 'incentive_tier_4_target'
);
