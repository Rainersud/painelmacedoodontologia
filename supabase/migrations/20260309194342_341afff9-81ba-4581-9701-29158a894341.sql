ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS attendance_discount_status text NOT NULL DEFAULT 'elegivel';

-- Add meta setting for discount percentage
INSERT INTO public.meta_settings (setting_key, setting_value, description)
VALUES ('desconto_comparecimento_percentual', 5, 'Percentual de desconto por comparecimento no primeiro agendamento')
ON CONFLICT (setting_key) DO NOTHING;