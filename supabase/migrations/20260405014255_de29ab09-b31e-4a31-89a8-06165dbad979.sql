
-- Remove duplicates: keep only the record with the most data per lead_id
DELETE FROM public.upsell_opportunities
WHERE id NOT IN (
  SELECT DISTINCT ON (lead_id) id
  FROM public.upsell_opportunities
  ORDER BY lead_id, 
    CASE WHEN closed_value > 0 THEN 1 ELSE 0 END DESC,
    CASE WHEN notes IS NOT NULL THEN 1 ELSE 0 END DESC,
    CASE WHEN estimated_value > 0 THEN 1 ELSE 0 END DESC,
    purchase_count DESC,
    created_at ASC
);

-- Fix trigger to prevent future duplicates - only create ONE record per lead
CREATE OR REPLACE FUNCTION public.auto_create_upsell_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'fechado' AND (OLD.status IS NULL OR OLD.status <> 'fechado') THEN
    -- Only create if NO record exists for this lead
    IF NOT EXISTS (
      SELECT 1 FROM public.upsell_opportunities WHERE lead_id = NEW.id
    ) THEN
      INSERT INTO public.upsell_opportunities (
        lead_id, agent_id, status, suggested_treatment, treatment_category,
        estimated_value, contact_status, gift_sent
      ) VALUES (
        NEW.id, NEW.assigned_agent_id, 'comprou_1',
        COALESCE(NEW.interest_product, 'Revisão'), 'geral',
        COALESCE(NEW.treatment_value, 0), 'nao_contatado', false
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
