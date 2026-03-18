
-- Add referral columns to waitlist table
ALTER TABLE public.waitlist 
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS position integer,
  ADD COLUMN IF NOT EXISTS early_access boolean NOT NULL DEFAULT false;

-- Function to recalculate all waitlist positions
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

-- Trigger function: on new waitlist signup, handle referral attribution + recalc positions
CREATE OR REPLACE FUNCTION public.on_waitlist_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If referred by someone, increment their referral_count
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by != '' THEN
    UPDATE waitlist
    SET referral_count = referral_count + 1
    WHERE referral_code = NEW.referred_by;
  END IF;

  -- Recalculate all positions
  PERFORM recalculate_waitlist_positions();

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_waitlist_signup ON public.waitlist;

-- Create trigger
CREATE TRIGGER trg_waitlist_signup
AFTER INSERT ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.on_waitlist_signup();

-- Trigger for early access at 25 referrals
CREATE OR REPLACE FUNCTION public.on_waitlist_referral_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_count >= 25 AND (OLD.referral_count < 25 OR OLD.early_access = false) THEN
    NEW.early_access := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_early_access ON public.waitlist;

CREATE TRIGGER trg_waitlist_early_access
BEFORE UPDATE ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.on_waitlist_referral_milestone();

-- Enable realtime for waitlist
ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist;

-- Initialize positions for existing rows
SELECT public.recalculate_waitlist_positions();
