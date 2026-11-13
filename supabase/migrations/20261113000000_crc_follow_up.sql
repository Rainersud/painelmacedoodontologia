-- CRC (central de relacionamento) dentro do Follow Up.
-- Só ACRESCENTA estrutura: nenhum dado existente é alterado.

-- 1) Link do prontuário original no lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prontuario_url text;

-- 2) Posição de cada lead nos quadros do CRC (coluna do kanban)
CREATE TABLE IF NOT EXISTS public.crc_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board text NOT NULL,            -- sem_confirmacao | aniversariantes | desmarcacoes | faltas | faltas_primeira
                                  -- | inadimplencia | orcamentos | tratamento_sem_agendamento
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage text NOT NULL,            -- coluna do quadro
  manual boolean NOT NULL DEFAULT false,  -- colocado à mão (fora da regra automática)
  archived_at timestamptz,        -- tirado do quadro; volta só se acontecer um caso novo
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_crc_cards_board ON public.crc_cards(board);

-- 3) Histórico do acompanhamento: situação, contato, anotações, prints e mudanças de coluna
CREATE TABLE IF NOT EXISTS public.crc_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  board text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('situacao', 'contato', 'nota', 'anexo', 'movimento')),
  body text,
  file_path text,
  file_name text,
  mime_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crc_entries_lead ON public.crc_entries(lead_id, created_at DESC);

-- Mesmo acesso aberto das demais tabelas do painel
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crc_cards, public.crc_entries TO anon, authenticated;
GRANT ALL ON public.crc_cards, public.crc_entries TO service_role;
ALTER TABLE public.crc_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crc_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "App open access" ON public.crc_cards;
CREATE POLICY "App open access" ON public.crc_cards FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "App open access" ON public.crc_entries;
CREATE POLICY "App open access" ON public.crc_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4) Pasta privada para prints e arquivos do CRC
INSERT INTO storage.buckets (id, name, public) VALUES ('crc-attachments', 'crc-attachments', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "crc attachments open read" ON storage.objects;
CREATE POLICY "crc attachments open read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'crc-attachments');
DROP POLICY IF EXISTS "crc attachments open insert" ON storage.objects;
CREATE POLICY "crc attachments open insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'crc-attachments');
DROP POLICY IF EXISTS "crc attachments open delete" ON storage.objects;
CREATE POLICY "crc attachments open delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'crc-attachments');
