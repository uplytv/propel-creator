
-- Add qualifying question columns to waitlist
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS is_monetizing text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS monthly_earnings text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS monetization_challenges text[];
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS first_use_case text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS hear_about text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS business_category text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS monetization_goal text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS user_id uuid;

-- Fix on_waitlist_signup trigger function
CREATE OR REPLACE FUNCTION public.on_waitlist_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by != '' THEN
    UPDATE waitlist 
    SET referral_count = referral_count + 1
    WHERE referral_code = NEW.referred_by;
    
    UPDATE affiliate_links
    SET signups = signups + 1
    WHERE code = NEW.referred_by;
  END IF;
  
  PERFORM recalculate_waitlist_positions();
  
  RETURN NEW;
END;
$$;

-- Fix recalculate_waitlist_positions
CREATE OR REPLACE FUNCTION public.recalculate_waitlist_positions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE waitlist w
  SET position = GREATEST(1, sub.base_pos - (w.referral_count * 10))
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS base_pos
    FROM waitlist
  ) sub
  WHERE w.id = sub.id;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_waitlist_signup_trigger ON waitlist;
CREATE TRIGGER on_waitlist_signup_trigger
  AFTER INSERT ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION on_waitlist_signup();

-- Ensure the milestone trigger exists
DROP TRIGGER IF EXISTS on_waitlist_referral_milestone_trigger ON waitlist;
CREATE TRIGGER on_waitlist_referral_milestone_trigger
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION on_waitlist_referral_milestone();
