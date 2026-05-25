ALTER TABLE public.incentive_plans DROP CONSTRAINT IF EXISTS incentive_plans_target_type_check;
ALTER TABLE public.incentive_plans ADD CONSTRAINT incentive_plans_target_type_check CHECK (target_type IN ('agendamentos','comparecimentos','indicacoes','fechados','resgatados'));
UPDATE public.incentive_plans SET target_type='indicacoes', name='Indicações' WHERE target_type='resgatados';