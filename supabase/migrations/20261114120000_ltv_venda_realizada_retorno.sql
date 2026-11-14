-- Venda realizada → Comercial 2 (LTV) automaticamente, com o retorno marcado para 6 meses
-- depois da data da venda (closed_at). A data pode ser mudada à mão no card do LTV.
--
-- Antes: o gatilho só reagia ao status 'fechado' e criava o card sem data de retorno.
-- Agora: reage a qualquer status de venda, preenche next_return_date e, se a data da venda
-- for corrigida depois, o retorno acompanha (desde que ninguém tenha mudado a data à mão).

CREATE OR REPLACE FUNCTION public.ltv_return_from_sale(sold_at timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT ((COALESCE(sold_at, now()) AT TIME ZONE 'America/Sao_Paulo')::date + interval '6 months')::date
$$;

CREATE OR REPLACE FUNCTION public.auto_create_upsell_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sold_statuses text[] := ARRAY['fechado', 'pos_venda', 'tratamento_andamento', 'concluido'];
  was_sold boolean := TG_OP = 'UPDATE' AND OLD.status::text = ANY (sold_statuses);
  is_sold boolean := NEW.status::text = ANY (sold_statuses);
BEGIN
  -- Entrou em venda realizada: cria o card no LTV (ou completa a data de retorno)
  IF is_sold AND NOT was_sold THEN
    IF NOT EXISTS (SELECT 1 FROM public.upsell_opportunities WHERE lead_id = NEW.id) THEN
      INSERT INTO public.upsell_opportunities (
        lead_id, agent_id, status, suggested_treatment, treatment_category, estimated_value,
        contact_status, gift_sent, purchase_count, next_return_date, return_scheduled, last_stage_change_at
      ) VALUES (
        NEW.id, NEW.assigned_agent_id, 'comprou_1', COALESCE(NEW.interest_product, 'Revisão'), 'geral',
        COALESCE(NEW.treatment_value, 0), 'nao_contatado', false, 1,
        public.ltv_return_from_sale(NEW.closed_at), false, now()
      );
    ELSE
      UPDATE public.upsell_opportunities
         SET next_return_date = public.ltv_return_from_sale(NEW.closed_at)
       WHERE lead_id = NEW.id AND next_return_date IS NULL;
    END IF;
  END IF;

  -- Data da venda corrigida: o retorno acompanha, se ainda estiver na data automática
  IF TG_OP = 'UPDATE' AND is_sold AND was_sold
     AND NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    UPDATE public.upsell_opportunities
       SET next_return_date = public.ltv_return_from_sale(NEW.closed_at)
     WHERE lead_id = NEW.id
       AND (next_return_date IS NULL OR next_return_date = public.ltv_return_from_sale(OLD.closed_at));
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_auto_upsell_on_close ON public.leads;
CREATE TRIGGER trigger_auto_upsell_on_close
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_upsell_on_close();

-- Quem já está no LTV sem data de retorno: 6 meses depois da venda
UPDATE public.upsell_opportunities u
   SET next_return_date = public.ltv_return_from_sale(l.closed_at)
  FROM public.leads l
 WHERE l.id = u.lead_id AND u.next_return_date IS NULL AND l.closed_at IS NOT NULL;

-- Vendas antigas que ficaram sem card no LTV
INSERT INTO public.upsell_opportunities (
  lead_id, agent_id, status, suggested_treatment, treatment_category, estimated_value,
  contact_status, gift_sent, purchase_count, next_return_date, return_scheduled, last_stage_change_at
)
SELECT l.id, l.assigned_agent_id, 'comprou_1', COALESCE(l.interest_product, 'Revisão'), 'geral',
       COALESCE(l.treatment_value, 0), 'nao_contatado', false, 1,
       public.ltv_return_from_sale(l.closed_at), false, now()
  FROM public.leads l
 WHERE l.status::text IN ('fechado', 'pos_venda', 'tratamento_andamento', 'concluido')
   AND NOT EXISTS (SELECT 1 FROM public.upsell_opportunities u WHERE u.lead_id = l.id);
