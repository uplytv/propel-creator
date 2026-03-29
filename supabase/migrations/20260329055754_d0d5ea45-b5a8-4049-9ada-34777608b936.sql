
-- Part 1: Waitlist columns for email tracking
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS prize_tier text DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS leaderboard_rank integer DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS previous_leaderboard_rank integer DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS last_rank_email_sent_at timestamptz DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS last_position_email_sent_at timestamptz DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS milestone_3_email_sent_at timestamptz DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS milestone_10_email_sent_at timestamptz DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS milestone_25_email_sent_at timestamptz DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS early_access_email_sent_at timestamptz DEFAULT null;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS referrer_notification_email_sent_count integer DEFAULT 0;

-- Email unsubscribes table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  unsubscribed_at timestamptz DEFAULT now()
);
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Creator lifecycle tracking columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz DEFAULT null;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS day3_email_sent_at timestamptz DEFAULT null;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS day7_email_sent_at timestamptz DEFAULT null;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS day14_email_sent_at timestamptz DEFAULT null;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_stream_email_sent_at timestamptz DEFAULT null;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_payment_email_sent_at timestamptz DEFAULT null;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_reengagement_email_sent_at timestamptz DEFAULT null;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_revenue_milestone_amount numeric DEFAULT 0;

-- Member lifecycle tracking on member_subscriptions
ALTER TABLE member_subscriptions ADD COLUMN IF NOT EXISTS member_welcome_email_sent_at timestamptz DEFAULT null;
ALTER TABLE member_subscriptions ADD COLUMN IF NOT EXISTS member_day3_email_sent_at timestamptz DEFAULT null;
ALTER TABLE member_subscriptions ADD COLUMN IF NOT EXISTS member_renewal_reminder_sent_at timestamptz DEFAULT null;

-- Suppression check function
CREATE OR REPLACE FUNCTION is_email_suppressed(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM email_unsubscribes WHERE email = p_email
  )
$$;

-- Leaderboard rank calculation
CREATE OR REPLACE FUNCTION calculate_waitlist_leaderboard_rank()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE waitlist SET previous_leaderboard_rank = leaderboard_rank
  WHERE leaderboard_rank IS NOT NULL;

  UPDATE waitlist w
  SET leaderboard_rank = ranked.rank
  FROM (
    SELECT id,
           RANK() OVER (ORDER BY referral_count DESC, created_at ASC)::integer as rank
    FROM waitlist
  ) ranked
  WHERE w.id = ranked.id;
END;
$$;

-- Batch functions for cron
CREATE OR REPLACE FUNCTION check_rank_movements_and_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  edge_url text;
BEGIN
  edge_url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://dbjlhmbgskvhuzqvqfrl.supabase.co');
  
  FOR r IN
    SELECT id, leaderboard_rank, previous_leaderboard_rank, email
    FROM waitlist
    WHERE leaderboard_rank IS NOT NULL
      AND previous_leaderboard_rank IS NOT NULL
      AND (previous_leaderboard_rank - leaderboard_rank) >= 5
      AND (last_rank_email_sent_at IS NULL OR last_rank_email_sent_at < now() - interval '24 hours')
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := edge_url || '/functions/v1/send-waitlist-emails',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object('event_type', 'rank_movement', 'waitlist_id', r.id)
      );
      UPDATE waitlist SET last_rank_email_sent_at = now(), previous_leaderboard_rank = leaderboard_rank WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'rank_movement email failed for %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- A/B test results view
CREATE OR REPLACE VIEW email_ab_test_results AS
SELECT
  template_name,
  metadata->>'ab_variant' as variant,
  COUNT(*) as emails_sent,
  COUNT(*) FILTER (WHERE status = 'sent') as delivered,
  ROUND(COUNT(*) FILTER (WHERE status = 'sent')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100, 1) as delivery_rate
FROM email_send_log
WHERE metadata->>'ab_variant' IS NOT NULL
GROUP BY template_name, metadata->>'ab_variant'
ORDER BY template_name, variant;

-- Update on_waitlist_signup to also call leaderboard recalc
CREATE OR REPLACE FUNCTION on_waitlist_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_row waitlist%ROWTYPE;
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by != '' THEN
    SELECT * INTO referrer_row FROM waitlist WHERE referral_code = NEW.referred_by LIMIT 1;
    IF FOUND THEN
      UPDATE waitlist SET referral_count = referral_count + 1 WHERE id = referrer_row.id;
      UPDATE affiliate_links SET signups = signups + 1 WHERE code = NEW.referred_by;
      RAISE NOTICE 'Referral attributed: % referred by % (code: %)', NEW.full_name, referrer_row.full_name, NEW.referred_by;
    ELSE
      RAISE NOTICE 'Referral code not found in waitlist: %, trying affiliate_links', NEW.referred_by;
      UPDATE affiliate_links SET signups = signups + 1 WHERE code = NEW.referred_by;
      DECLARE
        v_referrer_wl waitlist%ROWTYPE;
      BEGIN
        SELECT w.* INTO v_referrer_wl FROM waitlist w JOIN profiles p ON p.user_id = w.user_id WHERE p.referral_code = NEW.referred_by LIMIT 1;
        IF FOUND THEN
          UPDATE waitlist SET referral_count = referral_count + 1 WHERE id = v_referrer_wl.id;
          RAISE NOTICE 'Referral attributed via profile referral_code: %', NEW.referred_by;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not find referrer via profile: %', SQLERRM;
      END;
      DECLARE
        v_aff_user_id uuid;
        v_aff_wl waitlist%ROWTYPE;
      BEGIN
        SELECT user_id INTO v_aff_user_id FROM affiliate_links WHERE code = NEW.referred_by LIMIT 1;
        IF v_aff_user_id IS NOT NULL THEN
          SELECT * INTO v_aff_wl FROM waitlist WHERE user_id = v_aff_user_id LIMIT 1;
          IF FOUND THEN
            UPDATE waitlist SET referral_count = referral_count + 1 WHERE id = v_aff_wl.id;
            RAISE NOTICE 'Referral attributed via affiliate_links user: %', NEW.referred_by;
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not find referrer via affiliate_links: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  PERFORM recalculate_waitlist_positions();
  PERFORM calculate_waitlist_leaderboard_rank();
  
  RETURN NEW;
END;
$$;
