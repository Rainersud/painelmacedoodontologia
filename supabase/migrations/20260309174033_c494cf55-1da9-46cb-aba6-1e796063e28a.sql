
-- Referrals table: tracks who referred whom with rewards and discounts
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  referred_lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL DEFAULT 'dinheiro', -- 'dinheiro' or 'credito'
  reward_value NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'percentual', -- 'percentual' or 'fixo'
  discount_value NUMERIC NOT NULL DEFAULT 0,
  attendance_discount_eligible BOOLEAN NOT NULL DEFAULT true,
  attendance_discount_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_lead_id, referred_lead_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update referrals"
  ON public.referrals FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete referrals"
  ON public.referrals FOR DELETE TO authenticated
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
