
CREATE TABLE public.triage_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  triage_id UUID REFERENCES public.patient_triage(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  referral_name TEXT NOT NULL,
  situation TEXT NOT NULL DEFAULT 'dentadura',
  relationship TEXT,
  converted_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.triage_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view triage referrals"
  ON public.triage_referrals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert triage referrals"
  ON public.triage_referrals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update triage referrals"
  ON public.triage_referrals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete triage referrals"
  ON public.triage_referrals FOR DELETE TO authenticated USING (true);
