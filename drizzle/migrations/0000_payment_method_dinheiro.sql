-- Forma de pagamento "Dinheiro".
-- Só amplia os valores aceitos em payments.payment_method; nenhum dado existente muda.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('credito', 'debito', 'pix', 'cheque', 'boleto', 'dinheiro'));