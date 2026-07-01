CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule of the same name so this is idempotent.
DO $$
BEGIN
  PERFORM cron.unschedule('blake-subscription-alerts-scan');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'blake-subscription-alerts-scan',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/blake-subscription-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alerts-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'BLAKE_ALERTS_CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);