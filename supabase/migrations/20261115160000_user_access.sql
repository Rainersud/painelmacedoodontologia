-- Perfil de acesso de cada usuário (tela). O papel admin (user_roles) continua mandando em tudo.
--   completo        : tudo, menos financeiro/metas/administração se não for admin
--   atendimento     : (Ariane) trabalha nos leads; sem colunas Compareceu / Não compareceu do Comercial 1
--   comparecimento  : (Lidiane) só as colunas Compareceu / Não compareceu do Comercial 1
CREATE TABLE IF NOT EXISTS public.user_access (
  user_id uuid PRIMARY KEY,
  perfil text NOT NULL DEFAULT 'atendimento' CHECK (perfil IN ('completo', 'atendimento', 'comparecimento')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "App open access" ON public.user_access FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
