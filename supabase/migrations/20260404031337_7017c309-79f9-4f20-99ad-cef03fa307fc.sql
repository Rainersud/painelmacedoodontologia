
-- Function to auto-create upsell opportunity when lead reaches 'fechado'
CREATE OR REPLACE FUNCTION public.auto_create_upsell_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes TO 'fechado'
  IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
    -- Check if an upsell opportunity already exists for this lead
    IF NOT EXISTS (
      SELECT 1 FROM public.upsell_opportunities WHERE lead_id = NEW.id
    ) THEN
      -- Insert a base opportunity
      INSERT INTO public.upsell_opportunities (
        lead_id,
        agent_id,
        status,
        suggested_treatment,
        treatment_category,
        estimated_value,
        contact_status
      ) VALUES (
        NEW.id,
        NEW.assigned_agent_id,
        'base_pacientes',
        COALESCE(NEW.interest_product, 'Revisão'),
        'geral',
        0,
        'nao_contatado'
      );
    END IF;

    -- Also auto-generate from treatment suggestions
    INSERT INTO public.upsell_opportunities (
      lead_id,
      agent_id,
      status,
      suggested_treatment,
      treatment_category,
      estimated_value,
      contact_status
    )
    SELECT
      NEW.id,
      NEW.assigned_agent_id,
      'base_pacientes',
      s.suggested_treatment,
      s.category,
      0,
      'nao_contatado'
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

-- Create the trigger on leads table
DROP TRIGGER IF EXISTS trigger_auto_upsell_on_close ON public.leads;
CREATE TRIGGER trigger_auto_upsell_on_close
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_upsell_on_close();
