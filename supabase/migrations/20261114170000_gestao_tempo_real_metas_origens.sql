-- Gestão em tempo real: custos de aquisição e metas também avisam as telas quando mudam
ALTER PUBLICATION supabase_realtime ADD TABLE public.acquisition_costs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meta_settings;

-- Metas diárias das Origens Estratégicas (antes fixas no código), escaladas junto com o
-- objetivo central (faturamento + ticket médio) na tela de Metas da Clínica
INSERT INTO public.meta_settings (setting_key, setting_value, description)
SELECT k, v, d FROM (VALUES
  ('meta_origem_indicacao_pac_dia', 10, 'Meta diária de leads por Indicação de paciente'),
  ('meta_origem_prospeccao_ativa_dia', 6, 'Meta diária de leads por Prospecção ativa'),
  ('meta_origem_indicacao_parceria_dia', 5, 'Meta diária de leads por Indicação de parceria'),
  ('meta_origem_social_selling_dia', 5, 'Meta diária de leads por Social selling')
) AS t(k, v, d)
WHERE NOT EXISTS (SELECT 1 FROM public.meta_settings m WHERE m.setting_key = t.k);
