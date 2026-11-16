-- "Resgate" em "Como o lead chegou?": a marcação define o resgate em todo o painel.
ALTER TYPE public.lead_arrival_source ADD VALUE IF NOT EXISTS 'resgate';

-- rescued_at acompanha a origem: marcou Resgate = data do resgate; trocou para outra = deixa de contar.
CREATE OR REPLACE FUNCTION public.sync_rescued_at_from_origin()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.lead_arrival_source::text = 'resgate' THEN
    IF TG_OP = 'INSERT' OR OLD.lead_arrival_source IS DISTINCT FROM NEW.lead_arrival_source OR NEW.rescued_at IS NULL THEN
      NEW.rescued_at := COALESCE(CASE WHEN TG_OP = 'UPDATE' AND OLD.lead_arrival_source::text = 'resgate' THEN OLD.rescued_at END, now());
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.lead_arrival_source::text = 'resgate' THEN
    NEW.rescued_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_rescued_at ON public.leads;
CREATE TRIGGER trg_sync_rescued_at
  BEFORE INSERT OR UPDATE OF lead_arrival_source, rescued_at ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_rescued_at_from_origin();
