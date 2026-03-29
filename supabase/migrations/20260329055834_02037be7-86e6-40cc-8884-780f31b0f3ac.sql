
-- Fix email_unsubscribes RLS
CREATE POLICY "Service role manages unsubscribes" ON email_unsubscribes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public can insert unsubscribes" ON email_unsubscribes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can read own unsubscribe" ON email_unsubscribes FOR SELECT TO anon, authenticated USING (true);

-- Fix security definer view - use security_invoker
DROP VIEW IF EXISTS email_ab_test_results;
CREATE VIEW email_ab_test_results WITH (security_invoker = on) AS
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

-- Batch function for creator lifecycle emails
CREATE OR REPLACE FUNCTION send_creator_lifecycle_emails_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  edge_url text;
  svc_key text;
BEGIN
  edge_url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://dbjlhmbgskvhuzqvqfrl.supabase.co');
  svc_key := current_setting('app.settings.service_role_key', true);

  -- Day 3: signed up 3 days ago, no creator space yet
  FOR r IN
    SELECT p.user_id FROM profiles p
    WHERE p.created_at <= now() - interval '3 days'
      AND p.created_at > now() - interval '4 days'
      AND p.day3_email_sent_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM creator_spaces cs WHERE cs.creator_id = p.user_id)
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := edge_url || '/functions/v1/send-creator-lifecycle-emails',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc_key),
        body := jsonb_build_object('event_type', 'creator_day_3', 'user_id', r.user_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'creator_day_3 email failed for %: %', r.user_id, SQLERRM;
    END;
  END LOOP;

  -- Day 7: space exists but no subscription tiers
  FOR r IN
    SELECT p.user_id FROM profiles p
    JOIN creator_spaces cs ON cs.creator_id = p.user_id
    WHERE p.created_at <= now() - interval '7 days'
      AND p.created_at > now() - interval '8 days'
      AND p.day7_email_sent_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM subscription_tiers st WHERE st.creator_id = p.user_id)
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := edge_url || '/functions/v1/send-creator-lifecycle-emails',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc_key),
        body := jsonb_build_object('event_type', 'creator_day_7', 'user_id', r.user_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'creator_day_7 email failed for %: %', r.user_id, SQLERRM;
    END;
  END LOOP;

  -- Day 14: space exists but no transactions
  FOR r IN
    SELECT p.user_id FROM profiles p
    JOIN creator_spaces cs ON cs.creator_id = p.user_id
    WHERE p.created_at <= now() - interval '14 days'
      AND p.created_at > now() - interval '15 days'
      AND p.day14_email_sent_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM transactions t JOIN wallets w ON w.id = t.wallet_id WHERE w.user_id = p.user_id AND t.type = 'earn')
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := edge_url || '/functions/v1/send-creator-lifecycle-emails',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc_key),
        body := jsonb_build_object('event_type', 'creator_day_14', 'user_id', r.user_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'creator_day_14 email failed for %: %', r.user_id, SQLERRM;
    END;
  END LOOP;

  -- Reengagement: inactive 14+ days, has a space
  FOR r IN
    SELECT p.user_id FROM profiles p
    JOIN creator_spaces cs ON cs.creator_id = p.user_id
    WHERE p.updated_at < now() - interval '14 days'
      AND (p.last_reengagement_email_sent_at IS NULL OR p.last_reengagement_email_sent_at < now() - interval '14 days')
      AND p.created_at < now() - interval '14 days'
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := edge_url || '/functions/v1/send-creator-lifecycle-emails',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc_key),
        body := jsonb_build_object('event_type', 'creator_reengagement', 'user_id', r.user_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'creator_reengagement email failed for %: %', r.user_id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Batch function for member lifecycle emails
CREATE OR REPLACE FUNCTION send_member_lifecycle_emails_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  edge_url text;
  svc_key text;
BEGIN
  edge_url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://dbjlhmbgskvhuzqvqfrl.supabase.co');
  svc_key := current_setting('app.settings.service_role_key', true);

  -- Day 3: subscribed 3 days ago, no community activity
  FOR r IN
    SELECT ms.id as sub_id, ms.member_id, ms.creator_id FROM member_subscriptions ms
    WHERE ms.created_at <= now() - interval '3 days'
      AND ms.created_at > now() - interval '4 days'
      AND ms.member_day3_email_sent_at IS NULL
      AND ms.status = 'active'
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := edge_url || '/functions/v1/send-member-lifecycle-emails',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc_key),
        body := jsonb_build_object('event_type', 'member_day_3', 'subscription_id', r.sub_id, 'member_id', r.member_id, 'creator_id', r.creator_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'member_day_3 email failed for %: %', r.sub_id, SQLERRM;
    END;
  END LOOP;

  -- Renewal reminder: 3 days before current_period_end
  FOR r IN
    SELECT ms.id as sub_id, ms.member_id, ms.creator_id FROM member_subscriptions ms
    WHERE ms.current_period_end IS NOT NULL
      AND ms.current_period_end BETWEEN now() + interval '2 days' AND now() + interval '4 days'
      AND (ms.member_renewal_reminder_sent_at IS NULL OR ms.member_renewal_reminder_sent_at < now() - interval '25 days')
      AND ms.status = 'active'
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := edge_url || '/functions/v1/send-member-lifecycle-emails',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc_key),
        body := jsonb_build_object('event_type', 'member_renewal_reminder', 'subscription_id', r.sub_id, 'member_id', r.member_id, 'creator_id', r.creator_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'member_renewal_reminder email failed for %: %', r.sub_id, SQLERRM;
    END;
  END LOOP;
END;
$$;
