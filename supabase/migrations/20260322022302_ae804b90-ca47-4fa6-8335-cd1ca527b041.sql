
-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS role_type text DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY "System can insert referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK (referred_id = auth.uid());

-- Create invite_codes table
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invite codes" ON public.invite_codes FOR SELECT TO authenticated USING (owner_id = auth.uid() OR used_by = auth.uid());
CREATE POLICY "Users can use invite codes" ON public.invite_codes FOR UPDATE TO authenticated USING (is_used = false) WITH CHECK (used_by = auth.uid());
CREATE POLICY "Anon can read codes for validation" ON public.invite_codes FOR SELECT TO anon USING (true);

-- Function to generate invite codes on approval
CREATE OR REPLACE FUNCTION public.generate_invite_codes_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  i int;
  new_code text;
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved = false OR OLD.is_approved IS NULL) THEN
    FOR i IN 1..5 LOOP
      new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      INSERT INTO public.invite_codes (code, owner_id) VALUES (new_code, NEW.user_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_approved
  AFTER UPDATE OF is_approved ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invite_codes_on_approval();

-- Function to generate referral code for new profiles
CREATE OR REPLACE FUNCTION public.generate_profile_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(random()::text || NEW.user_id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_profile_referral_code();

-- Enable realtime on profiles for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
