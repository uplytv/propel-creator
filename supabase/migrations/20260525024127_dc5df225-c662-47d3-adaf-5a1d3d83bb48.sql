-- 1) Column-level revoke on creator_platform_oauth tokens
REVOKE SELECT (access_token, refresh_token) ON public.creator_platform_oauth FROM anon, authenticated;

-- 2) Drop sensitive tables from realtime publication if present
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'creator_platform_oauth',
    'wallets',
    'transactions',
    'subscribers',
    'member_subscriptions'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;