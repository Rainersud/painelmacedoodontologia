
ALTER TABLE public.upsell_opportunities ADD COLUMN IF NOT EXISTS gift_sent boolean NOT NULL DEFAULT false;
ALTER TABLE public.upsell_opportunities ADD COLUMN IF NOT EXISTS gift_sent_at timestamp with time zone DEFAULT NULL;

-- Update trigger to ensure gift_sent defaults to false (already handled by column default)

-- Update the auto_create_upsell_on_close function to include gift_sent = false explicitly
CREATE OR REPLACE FUNCTION public.auto_create_upsell_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.upsell_opportunities WHERE lead_id = NEW.id
    ) THEN
      INSERT INTO public.upsell_opportunities (
        lead_id, agent_id, status, suggested_treatment, treatment_category,
        estimated_value, contact_status, gift_sent
      ) VALUES (
        NEW.id, NEW.assigned_agent_id, 'base_pacientes',
        COALESCE(NEW.interest_product, 'Revisão'), 'geral', 0, 'nao_contatado', false
      );
    END IF;

    INSERT INTO public.upsell_opportunities (
      lead_id, agent_id, status, suggested_treatment, treatment_category,
      estimated_value, contact_status, gift_sent
    )
    SELECT
      NEW.id, NEW.assigned_agent_id, 'base_pacientes',
      s.suggested_treatment, s.category, 0, 'nao_contatado', false
    FROM public.upsell_treatment_suggestions s
    WHERE s.is_active = true
      AND s.trigger_treatment = COALESCE(NEW.interest_product, 'outro')
      AND NOT EXISTS (
        SELECT 1 FROM public.upsell_opportunities o
        WHERE o.lead_id = NEW.id AND o.suggested_treatment = s.suggested_treatment
      );
  END IF;
  RETURN NEW;
END;
$$;
