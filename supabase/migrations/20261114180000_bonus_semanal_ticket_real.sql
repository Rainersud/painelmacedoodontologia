-- Bônus por metas: responsáveis por grupo (resultados não se misturam) e valores da regra semanal
CREATE TABLE IF NOT EXISTS public.bonus_responsaveis (
  grupo text PRIMARY KEY CHECK (grupo IN ('atendimento', 'indicacoes')),
  nome text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bonus_responsaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "App open access" ON public.bonus_responsaveis FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.bonus_responsaveis (grupo, nome) VALUES
  ('atendimento', 'Ariane'),
  ('indicacoes', 'Lidiane')
ON CONFLICT (grupo) DO NOTHING;

-- R$ 100 por semana batida; metas semanais de resgate e de indicações (editáveis na tela)
INSERT INTO public.meta_settings (setting_key, setting_value, description)
SELECT k, v, d FROM (VALUES
  ('bonus_semana_valor', 100, 'Bônus por semana com todas as metas do grupo batidas (R$)'),
  ('bonus_resgatados_semana', 3, 'Meta semanal de resgates (Atendimento)'),
  ('bonus_indicacoes_semana', 10, 'Meta semanal de indicações coletadas')
) AS t(k, v, d)
WHERE NOT EXISTS (SELECT 1 FROM public.meta_settings m WHERE m.setting_key = t.k);

-- Ticket médio da meta compatível com o objetivo: R$ 100.000 ÷ 27 vendas
-- (≈ 450 leads/mês × 50% × 40% × 30% = 27 vendas; ~56 agendamentos por semana)
UPDATE public.meta_settings SET setting_value = 3704, updated_at = now() WHERE setting_key = 'meta_ticket_medio';
