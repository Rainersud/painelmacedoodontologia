-- Fim de ciclo: a pessoa não quer mais receber contato.
-- Sai dos quadros de contato do CRC, dos retornos e do remarketing (ver src/lib/contactCycle.ts).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_opt_out_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_opt_out_reason text;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_opt_out_reason_len;
ALTER TABLE public.leads ADD CONSTRAINT leads_opt_out_reason_len
  CHECK (contact_opt_out_reason IS NULL OR char_length(contact_opt_out_reason) <= 300);
CREATE INDEX IF NOT EXISTS idx_leads_opt_out ON public.leads (contact_opt_out_at) WHERE contact_opt_out_at IS NOT NULL;
