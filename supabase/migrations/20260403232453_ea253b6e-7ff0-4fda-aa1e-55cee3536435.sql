
CREATE TABLE public.acquisition_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  reference_month DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.acquisition_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view acquisition costs" ON public.acquisition_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert acquisition costs" ON public.acquisition_costs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update acquisition costs" ON public.acquisition_costs FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete acquisition costs" ON public.acquisition_costs FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
