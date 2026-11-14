-- Plano de Incentivo Inteligente: Rainer (Comercial), Ariane (Atendimento), Lidiane (Indicações)
ALTER TABLE public.bonus_responsaveis DROP CONSTRAINT IF EXISTS bonus_responsaveis_grupo_check;
ALTER TABLE public.bonus_responsaveis ADD CONSTRAINT bonus_responsaveis_grupo_check
  CHECK (grupo IN ('comercial', 'atendimento', 'indicacoes'));
INSERT INTO public.bonus_responsaveis (grupo, nome) VALUES ('comercial', 'Rainer')
ON CONFLICT (grupo) DO NOTHING;

-- Resgates, indicações e origens viram fatias (%) dos leads da escada do objetivo central.
-- Calibrado para R$ 100 mil / ticket R$ 3.704 = 450 leads: 12, 40, 120, 100, 100 por mês.
INSERT INTO public.meta_settings (setting_key, setting_value, description)
SELECT t.k, t.v, t.d FROM (VALUES
  ('meta_pct_resgates', 2.66, 'Resgates: % dos leads do mês (escada do objetivo central)'),
  ('meta_pct_indicacoes', 8.88, 'Indicações coletadas: % dos leads do mês'),
  ('meta_pct_prospeccao_ativa', 26.66, 'Prospecção Ativa: % dos leads do mês'),
  ('meta_pct_indicacao_parceria', 22.22, 'Indicação de Parceria: % dos leads do mês'),
  ('meta_pct_social_selling', 22.22, 'Social Selling: % dos leads do mês'),
  ('bonus_viagem_valor', 5000, 'Bônus de viagem por responsável (R$)'),
  ('bonus_viagem_meses', 6, 'Meses seguidos com metas mensais batidas para a viagem')
) AS t(k, v, d)
WHERE NOT EXISTS (SELECT 1 FROM public.meta_settings m WHERE m.setting_key = t.k);
UPDATE public.meta_settings SET setting_value = 100, updated_at = now() WHERE setting_key = 'bonus_semana_valor';
