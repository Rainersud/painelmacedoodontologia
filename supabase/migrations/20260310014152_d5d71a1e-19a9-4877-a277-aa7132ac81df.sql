
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS bonus_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS bonus_paid_at timestamp with time zone DEFAULT NULL;
