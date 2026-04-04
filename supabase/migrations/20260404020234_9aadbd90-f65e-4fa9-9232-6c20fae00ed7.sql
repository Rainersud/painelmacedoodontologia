
CREATE TABLE public.ad_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  link_url TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',
  investment NUMERIC NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  leads_generated INTEGER NOT NULL DEFAULT 0,
  appointments INTEGER NOT NULL DEFAULT 0,
  attendance INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  reference_month DATE NOT NULL DEFAULT (date_trunc('month', now()))::date,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ad creatives" ON public.ad_creatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert ad creatives" ON public.ad_creatives FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update ad creatives" ON public.ad_creatives FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete ad creatives" ON public.ad_creatives FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_ad_creatives_updated_at BEFORE UPDATE ON public.ad_creatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
