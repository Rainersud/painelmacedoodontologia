CREATE POLICY "Authenticated users can delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (true);