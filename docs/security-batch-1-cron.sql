-- Security batch 1: cron jobs must authenticate to internal edge functions.
-- NOT a migration. Run manually in the SQL editor AFTER setting the CRON_SECRET
-- function secret, and BEFORE (or right after) deploying the batch-1 functions.
--
-- Internal functions now accept EITHER:
--   * header  x-cron-secret: <CRON_SECRET>
--   * header  Authorization: Bearer <service role key>   (what in-repo triggers already send)
-- Jobs that call with the anon key will start getting 401.

-- 1) Store the secret in Vault once:
--    select vault.create_secret('<same value as CRON_SECRET>', 'cron_secret');

-- 2) Find jobs that call edge functions:
select jobid, jobname, schedule, command
from cron.job
where command ilike '%/functions/v1/%';

-- 3) For each job that sends the anon key, re-schedule it with the secret, e.g.:
-- select cron.unschedule('<jobname>');
-- select cron.schedule('<jobname>', '<schedule>', $$
--   select net.http_post(
--     url := 'https://dbjlhmbgskvhuzqvqfrl.supabase.co/functions/v1/<function-name>',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
--     ),
--     body := '{}'::jsonb
--   );
-- $$);
