
-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_user boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS origin_member boolean NOT NULL DEFAULT false;

-- Create waitlist_config table
CREATE TABLE IF NOT EXISTS public.waitlist_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_amount integer NOT NULL DEFAULT 10000,
  end_date timestamp with time zone NOT NULL DEFAULT (now() + interval '90 days'),
  contest_ended boolean NOT NULL DEFAULT false,
  spots_jump_per_3_referrals integer NOT NULL DEFAULT 500,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read waitlist_config"
  ON public.waitlist_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can update waitlist_config"
  ON public.waitlist_config FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.waitlist_config (prize_amount, end_date, contest_ended, spots_jump_per_3_referrals)
VALUES (10000, now() + interval '90 days', false, 500);

-- Grandfather all existing users
UPDATE public.profiles
SET is_approved = true, beta_user = true
WHERE created_at IS NOT NULL;
