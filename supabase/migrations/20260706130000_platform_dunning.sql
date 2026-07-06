-- Platform-plan dunning: failed $97/$297/$497 creator payments get day-0/3/7
-- touches from the platform-dunning-check edge function (cron-invoked).
-- The Stripe webhook is intentionally NOT touched.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 1. dunning_notices — one row per (subscription, touch) sent.
--    UNIQUE(subscription_id, touch_number) is the idempotency
--    guard: re-runs / concurrent runs can never double-send.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dunning_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id text NOT NULL,
  touch_number integer NOT NULL CHECK (touch_number BETWEEN 1 AND 3),
  user_id uuid,
  customer_email text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, touch_number)
);

-- Service-role only: RLS enabled with NO policies means anon/authenticated
-- clients can neither read nor write; the edge function's service-role key
-- bypasses RLS.
ALTER TABLE public.dunning_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dunning_notices FROM anon, authenticated;

-- ============================================================
-- 2. Email -> auth user resolution helper for the dunning fn
--    (auth schema is not exposed over PostgREST). Locked down
--    to service_role only.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;

-- ============================================================
-- 3. Daily cron -> platform-dunning-check edge function.
--    Follows the blake-subscription-alerts precedent: secret
--    header pulled from Vault ('PLATFORM_DUNNING_CRON_SECRET'
--    must exist in Vault; same value set as an edge fn secret).
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('platform-dunning-check-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'platform-dunning-check-daily',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/platform-dunning-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dunning-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'PLATFORM_DUNNING_CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
