
-- Payments table for tracking all payment transactions
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('credito', 'debito', 'pix', 'cheque', 'boleto')),
  gross_value numeric NOT NULL DEFAULT 0,
  installments integer NOT NULL DEFAULT 1,
  fee_percentage numeric NOT NULL DEFAULT 0,
  fee_amount numeric NOT NULL DEFAULT 0,
  net_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  due_date date,
  paid_at timestamp with time zone,
  installment_number integer DEFAULT 1,
  total_installments integer DEFAULT 1,
  parent_payment_id uuid REFERENCES public.payments(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- Add budget_value to leads for storing the quoted treatment value
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_value numeric DEFAULT 0;
