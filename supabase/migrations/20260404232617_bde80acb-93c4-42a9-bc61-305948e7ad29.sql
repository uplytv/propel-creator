
-- Add beta_access_granted_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_access_granted_at timestamptz;

-- Stamp existing approved users
UPDATE public.profiles
SET beta_access_granted_at = updated_at
WHERE is_approved = true AND beta_access_granted_at IS NULL;

-- Update the trigger to also stamp beta_access_granted_at
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
    NEW.beta_access_granted_at := now();
    FOR i IN 1..5 LOOP
      new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      INSERT INTO public.invite_codes (code, owner_id)
      VALUES (new_code, NEW.user_id)
      ON CONFLICT (code) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Unified leaderboard view (authenticated only)
CREATE OR REPLACE VIEW public.unified_referral_leaderboard AS
SELECT
  p.user_id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.is_approved,
  p.origin_member,
  p.role_type,
  COALESCE(
    (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = p.user_id),
    0
  ) +
  COALESCE(
    (SELECT w.referral_count FROM public.waitlist w
     WHERE w.email = (SELECT au.email FROM auth.users au WHERE au.id = p.user_id LIMIT 1)
     LIMIT 1),
    0
  ) AS total_referrals
FROM public.profiles p
WHERE p.onboarding_complete = true
ORDER BY total_referrals DESC;

REVOKE ALL ON public.unified_referral_leaderboard FROM anon;
GRANT SELECT ON public.unified_referral_leaderboard TO authenticated;
