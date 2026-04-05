
CREATE OR REPLACE FUNCTION public.auto_create_upsell_on_close()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.upsell_opportunities WHERE lead_id = NEW.id
    ) THEN
      INSERT INTO public.upsell_opportunities (
        lead_id, agent_id, status, suggested_treatment, treatment_category,
        estimated_value, contact_status, gift_sent
      ) VALUES (
        NEW.id, NEW.assigned_agent_id, 'upsell_1',
        COALESCE(NEW.interest_product, 'Revisão'), 'geral', 0, 'nao_contatado', false
      );
    END IF;

    INSERT INTO public.upsell_opportunities (
      lead_id, agent_id, status, suggested_treatment, treatment_category,
      estimated_value, contact_status, gift_sent
    )
    SELECT
      NEW.id, NEW.assigned_agent_id, 'upsell_1',
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
$function$;

UPDATE public.upsell_opportunities SET status = 'upsell_1' WHERE status = 'base_pacientes';
UPDATE public.upsell_opportunities SET status = 'upsell_2' WHERE status = 'proposta_enviada';
UPDATE public.upsell_opportunities SET status = 'upsell_3' WHERE status = 'negociacao';
UPDATE public.upsell_opportunities SET status = 'upsell_5' WHERE status = 'venda_upsell';
