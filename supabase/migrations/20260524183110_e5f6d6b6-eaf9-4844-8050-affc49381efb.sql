-- Tabela de feriados da clínica
CREATE TABLE public.clinic_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view holidays"
  ON public.clinic_holidays FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert holidays"
  ON public.clinic_holidays FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update holidays"
  ON public.clinic_holidays FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete holidays"
  ON public.clinic_holidays FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER trg_clinic_holidays_updated_at
  BEFORE UPDATE ON public.clinic_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_clinic_holidays_date ON public.clinic_holidays(holiday_date);

-- Insere padrão de dias úteis (bitmask: Dom=1, Seg=2, Ter=4, Qua=8, Qui=16, Sex=32, Sab=64; 62 = Seg-Sex)
INSERT INTO public.meta_settings (setting_key, setting_value, description)
VALUES ('working_days_bitmask', 62, 'Dias úteis da semana (bitmask Dom=1..Sab=64; padrão 62 = Seg-Sex)')
ON CONFLICT DO NOTHING;