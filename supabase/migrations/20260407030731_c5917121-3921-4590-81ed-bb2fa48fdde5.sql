
-- Add lead_score and score_category to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 50;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score_category text NOT NULL DEFAULT 'morno';

-- Create rmkt_copy_templates table for copy suggestions per card
CREATE TABLE public.rmkt_copy_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_key text NOT NULL,
  phase text NOT NULL DEFAULT 'aquecimento',
  suggested_copy text NOT NULL DEFAULT '',
  custom_copy text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(stage_key)
);

ALTER TABLE public.rmkt_copy_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view copy templates" ON public.rmkt_copy_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert copy templates" ON public.rmkt_copy_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update copy templates" ON public.rmkt_copy_templates FOR UPDATE TO authenticated USING (true);

-- Insert default copy templates for each RMKT stage
INSERT INTO public.rmkt_copy_templates (stage_key, phase, suggested_copy) VALUES
-- Aquecimento
('dia_1', 'aquecimento', 'Olá! Tudo bem? Vi que você demonstrou interesse em nossos tratamentos. Posso te ajudar com alguma dúvida? 😊'),
('dia_3', 'aquecimento', 'Oi! Sabia que muitos pacientes tinham as mesmas dúvidas que você? Veja o depoimento de quem já transformou o sorriso! 💬'),
('dia_5', 'aquecimento', 'Olá! Separei um conteúdo especial sobre o procedimento que você buscou. Quer dar uma olhada? 📋'),
('dia_7', 'aquecimento', 'Oi! Uma semana se passou e quero te mostrar como funciona nosso atendimento humanizado. Posso te contar mais? 🤗'),
('dia_10', 'aquecimento', 'Olá! Muitos pacientes nos procuram com a mesma necessidade que você. Que tal agendarmos uma avaliação sem compromisso? 📅'),
('dia_15', 'aquecimento', 'Oi! Já imaginou como seria sua vida com um sorriso novo? Veja essa transformação incrível de um paciente nosso! ✨'),
('dia_20', 'aquecimento', 'Olá! Temos condições especiais esse mês. Posso te passar mais detalhes? 💰'),
('dia_25', 'aquecimento', 'Oi! Sabia que quanto antes iniciar o tratamento, melhor o resultado? Vamos conversar? 🦷'),
('dia_30', 'aquecimento', 'Olá! Faz um mês que conversamos. Ainda posso te ajudar com aquele tratamento? Estou à disposição! 😊'),
-- Nutrição
('dia_40', 'nutricao', 'Oi! Preparei um material exclusivo sobre os benefícios do tratamento que você buscou. Quer receber? 📚'),
('dia_50', 'nutricao', 'Olá! Veja como esse procedimento mudou a vida de nossos pacientes. Resultados reais! 📸'),
('dia_60', 'nutricao', 'Oi! 2 meses se passaram. Quero te mostrar nossos diferenciais e por que somos referência. Posso te enviar? 🏥'),
('dia_75', 'nutricao', 'Olá! Temos novidades incríveis na clínica. Quer saber mais sobre as novas tecnologias? 🔬'),
('dia_90', 'nutricao', 'Oi! 3 meses depois, quero reforçar: seu sorriso merece atenção! Vamos agendar uma conversa? 💪'),
('dia_105', 'nutricao', 'Olá! Conheça os cases de sucesso mais recentes da nossa clínica. Inspirador! 🌟'),
('dia_120', 'nutricao', 'Oi! Já pensou que este pode ser o momento ideal para cuidar do seu sorriso? Temos condições facilitadas! 💳'),
-- Reativação
('dia_140', 'reativacao', 'Olá! Sentimos sua falta! Temos novidades que podem te interessar. Posso compartilhar? 👋'),
('dia_160', 'reativacao', 'Oi! Passando para saber se você ainda tem interesse no tratamento. Como posso te ajudar? 🤔'),
('dia_180', 'reativacao', 'Olá! Já faz 6 meses. Muita coisa mudou na clínica! Quer conhecer nossas novidades? 🆕'),
('dia_200', 'reativacao', 'Oi! Temos uma oportunidade especial para pacientes que nos procuraram anteriormente. Interesse? 🎯'),
('dia_220', 'reativacao', 'Olá! Nossos pacientes estão transformando seus sorrisos. Você também pode! Vamos conversar? 😁'),
('dia_240', 'reativacao', 'Oi! 8 meses se passaram. Ainda estamos aqui para te ajudar quando você estiver pronto! 🤝'),
-- Urgência
('dia_270', 'urgencia', 'Olá! Condição exclusiva e limitada para você! Não perca essa oportunidade única. Posso te contar? ⚡'),
('dia_300', 'urgencia', 'Oi! 10 meses já! Essa pode ser sua última chance de aproveitar condições especiais. Interesse? ⏰'),
('dia_320', 'urgencia', 'Olá! Estamos com vagas limitadas para avaliação gratuita. Quer garantir a sua? 🔥'),
('dia_340', 'urgencia', 'Oi! Últimas vagas com desconto especial! Só até o final do mês. Posso reservar para você? 🚨'),
('dia_355', 'urgencia', 'Olá! Última tentativa de contato. Temos uma proposta exclusiva para você. Posso enviar? 💎')
ON CONFLICT (stage_key) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_rmkt_copy_templates_updated_at BEFORE UPDATE ON public.rmkt_copy_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
