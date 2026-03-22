
-- Create waitlist_config table (columns and trigger already applied)
-- Just need to re-run the parts that didn't apply

-- Create function to auto-approve users with 10+ referrals
CREATE OR REPLACE FUNCTION public.auto_approve_on_referral_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_count integer;
BEGIN
  SELECT COUNT(*) INTO ref_count
  FROM public.referrals
  WHERE referrer_id = NEW.referrer_id;

  IF ref_count >= 10 THEN
    UPDATE public.profiles
    SET is_approved = true, origin_member = true
    WHERE user_id = NEW.referrer_id AND is_approved = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_referral ON public.referrals;
CREATE TRIGGER trg_auto_approve_referral
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_on_referral_milestone();
