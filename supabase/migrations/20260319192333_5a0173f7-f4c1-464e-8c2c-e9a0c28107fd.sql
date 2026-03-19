
-- Fix leads RLS: allow all authenticated users to SELECT all leads
-- This ensures lead names are visible in tasks, dashboard, etc. for all users
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;

CREATE POLICY "Authenticated users can view all leads"
ON public.leads FOR SELECT
TO authenticated
USING (true);

-- Also open INSERT/UPDATE for all authenticated users so agents can work with any lead
DROP POLICY IF EXISTS "Admins can insert leads" ON public.leads;
CREATE POLICY "Authenticated users can insert leads"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update assigned leads" ON public.leads;
CREATE POLICY "Authenticated users can update leads"
ON public.leads FOR UPDATE
TO authenticated
USING (true);
