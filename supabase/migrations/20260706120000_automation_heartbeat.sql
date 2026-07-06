-- ============================================================
-- AUTOMATION HEARTBEAT (P0 reliability fix)
--
-- Problem: the marketing-automation edge functions
--   process-email-queue / process-scheduled-broadcasts / process-drip-sequences
-- were never scheduled. email_infra.sql (20260316094109) documents an
-- out-of-band cron job for process-email-queue that was never applied,
-- and the other two had no heartbeat at all. Drip enrollment also only
-- happened client-side (useAddSubscriber), so subscribers inserted any
-- other way (import, API, public form) never enrolled.
--
-- This migration:
--   1. Schedules all three functions via pg_cron + net.http_post,
--      following the existing precedent in 20260701190108
--      (blake-subscription-alerts-scan).
--   2. Adds a server-side AFTER INSERT trigger on public.subscribers that
--      enrolls new subscribers into matching active drip sequences,
--      replicating useAddSubscriber's client-side logic idempotently.
--
-- No new tables are created (so no new RLS policies are required).
-- No DROPs of tables/columns; only idempotent unschedule/trigger swaps.
--
-- REQUIRED SECRET (matches the name documented in email_infra.sql):
--   The Supabase service_role key must exist in Vault as
--   'email_queue_service_role_key'. If missing, create it once via SQL:
--     SELECT vault.create_secret('<service_role_key>', 'email_queue_service_role_key');
--   Until it exists the cron jobs fire with a null Authorization header
--   and the functions reject the call (401/403) — nothing breaks, the
--   heartbeat just stays inert.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Warn (but do not fail) if the vault secret the jobs depend on is absent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'email_queue_service_role_key') THEN
    RAISE WARNING 'Vault secret email_queue_service_role_key is missing — automation heartbeat cron jobs will not authenticate until it is created. Run: SELECT vault.create_secret(''<service_role_key>'', ''email_queue_service_role_key'');';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1. process-email-queue — every 5 seconds (cadence specified by the
--    out-of-band note in email_infra.sql lines 250-257), guarded by the
--    same two conditions that note documents:
--      a) skip while the rate-limit cooldown (email_send_state.retry_after_until) is active
--      b) only fire when auth_emails or transactional_emails has messages
--    Sub-minute schedules require pg_cron >= 1.5 (Supabase hosted ships 1.6).
--    verify_jwt = true for this function and it additionally requires a
--    service_role JWT in code, hence the Bearer service key from vault.
-- ------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('process-email-queue');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-email-queue',
  '5 seconds',
  $$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_send_state
    WHERE retry_after_until IS NOT NULL AND retry_after_until > now()
  )
  AND (
    EXISTS (SELECT 1 FROM pgmq.q_auth_emails)
    OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails)
  );
  $$
);

-- ------------------------------------------------------------
-- 2. process-scheduled-broadcasts — every 5 minutes.
--    Finds email_broadcasts with status='scheduled' and scheduled_at <= now()
--    and hands them to send-email-broadcast. Function takes no body/params.
-- ------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('process-scheduled-broadcasts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-scheduled-broadcasts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/process-scheduled-broadcasts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ------------------------------------------------------------
-- 3. process-drip-sequences — every 15 minutes.
--    Walks active drip_sequence_enrollments, honours per-step delay_hours
--    (minimum granularity is hours, so 15-minute polling is ample),
--    suppression, unsubscribes and branching. Function takes no body/params.
-- ------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('process-drip-sequences');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-drip-sequences',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/process-drip-sequences',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ------------------------------------------------------------
-- 4. Server-side drip enrollment.
--    Replicates useAddSubscriber (src/hooks/useSubscribers.ts):
--      trigger_event = 'rsvp' when source = 'rsvp', else 'new_subscriber';
--      enroll into every ACTIVE sequence of that creator with that trigger.
--    Runs on INSERT so imports / API inserts / public form edge functions
--    enroll too. Idempotent via the existing
--    UNIQUE(sequence_id, subscriber_email) constraint + ON CONFLICT DO
--    NOTHING, so the existing client-side upsert (ignoreDuplicates: true)
--    stays harmless and needs no change.
--
--    SECURITY DEFINER: subscriber inserts may come from anon/public roles,
--    but drip_sequence_enrollments RLS only lets the sequence's creator
--    write. The definer (migration owner) owns the table and bypasses RLS.
--    Enrollment failure must never block subscriber creation, hence the
--    warning-only exception handler.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enroll_subscriber_in_drip_sequences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.unsubscribed THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.drip_sequence_enrollments (sequence_id, subscriber_email)
    SELECT ds.id, NEW.email
    FROM public.drip_sequences ds
    WHERE ds.creator_id = NEW.creator_id
      AND ds.status = 'active'
      AND ds.trigger_event = CASE WHEN NEW.source = 'rsvp' THEN 'rsvp' ELSE 'new_subscriber' END
    ON CONFLICT (sequence_id, subscriber_email) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'drip auto-enrollment failed for % (creator %): %', NEW.email, NEW.creator_id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.enroll_subscriber_in_drip_sequences() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enroll_subscriber_in_drip_sequences ON public.subscribers;
CREATE TRIGGER trg_enroll_subscriber_in_drip_sequences
  AFTER INSERT ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.enroll_subscriber_in_drip_sequences();
