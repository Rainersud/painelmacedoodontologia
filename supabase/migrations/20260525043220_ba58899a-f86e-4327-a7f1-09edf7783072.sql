CREATE OR REPLACE FUNCTION public.prevent_leads_created_at_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_leads_created_at ON public.leads;

CREATE TRIGGER lock_leads_created_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.prevent_leads_created_at_update();