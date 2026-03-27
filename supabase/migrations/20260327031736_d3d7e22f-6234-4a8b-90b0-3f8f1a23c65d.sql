-- STEP 5: Add referred_by columns to profiles (IF NOT EXISTS pattern)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_username text;

-- STEP 5: Update handle_new_user to capture referral data from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, referred_by, referred_by_username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NULLIF(NEW.raw_user_meta_data->>'referred_by', ''),
    NULLIF(NEW.raw_user_meta_data->>'referrer_username', '')
  );
  RETURN NEW;
END;
$function$;

-- STEP 4: Fix the waitlist signup trigger
CREATE OR REPLACE FUNCTION public.on_waitlist_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_row waitlist%ROWTYPE;
BEGIN
  -- Only process if referred_by is not null and not empty
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by != '' THEN
    
    -- Find referrer by their referral_code in waitlist
    SELECT * INTO referrer_row
    FROM waitlist
    WHERE referral_code = NEW.referred_by
    LIMIT 1;
    
    IF FOUND THEN
      -- Increment referral count on the referrer's waitlist row
      UPDATE waitlist
      SET referral_count = referral_count + 1
      WHERE id = referrer_row.id;
      
      -- Also update affiliate_links
      UPDATE affiliate_links
      SET signups = signups + 1
      WHERE code = NEW.referred_by;
      
      RAISE NOTICE 'Referral attributed: % referred by % (code: %)', 
        NEW.full_name, referrer_row.full_name, NEW.referred_by;
    ELSE
      RAISE NOTICE 'Referral code not found in waitlist: %, trying affiliate_links', NEW.referred_by;
      
      -- Try affiliate_links as fallback for logged-in user referrals
      UPDATE affiliate_links
      SET signups = signups + 1
      WHERE code = NEW.referred_by;
      
      -- Also try matching by profile referral_code
      DECLARE
        v_referrer_wl waitlist%ROWTYPE;
      BEGIN
        SELECT w.* INTO v_referrer_wl
        FROM waitlist w
        JOIN profiles p ON p.user_id = w.user_id
        WHERE p.referral_code = NEW.referred_by
        LIMIT 1;
        
        IF FOUND THEN
          UPDATE waitlist
          SET referral_count = referral_count + 1
          WHERE id = v_referrer_wl.id;
          RAISE NOTICE 'Referral attributed via profile referral_code: %', NEW.referred_by;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not find referrer via profile: %', SQLERRM;
      END;
      
      -- Also try affiliate_links code -> user_id -> waitlist
      DECLARE
        v_aff_user_id uuid;
        v_aff_wl waitlist%ROWTYPE;
      BEGIN
        SELECT user_id INTO v_aff_user_id
        FROM affiliate_links
        WHERE code = NEW.referred_by
        LIMIT 1;
        
        IF v_aff_user_id IS NOT NULL THEN
          SELECT * INTO v_aff_wl
          FROM waitlist
          WHERE user_id = v_aff_user_id
          LIMIT 1;
          
          IF FOUND THEN
            UPDATE waitlist
            SET referral_count = referral_count + 1
            WHERE id = v_aff_wl.id;
            RAISE NOTICE 'Referral attributed via affiliate_links user: %', NEW.referred_by;
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not find referrer via affiliate_links: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  -- Always recalculate positions
  PERFORM recalculate_waitlist_positions();
  
  RETURN NEW;
END;
$function$;

-- STEP 4: Fix recalculate_waitlist_positions
CREATE OR REPLACE FUNCTION public.recalculate_waitlist_positions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  WITH ranked AS (
    SELECT 
      id,
      GREATEST(1, 
        ROW_NUMBER() OVER (ORDER BY created_at ASC)::integer - (referral_count * 10)
      ) as new_position
    FROM waitlist
  )
  UPDATE waitlist w
  SET position = ranked.new_position
  FROM ranked
  WHERE w.id = ranked.id;
END;
$function$;