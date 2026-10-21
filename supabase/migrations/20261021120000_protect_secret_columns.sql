-- Security batch 1: actually hide secret columns from client roles.
--
-- Column-level REVOKE (20260616230225) was a no-op: anon/authenticated still
-- held table-wide SELECT, which covers every column. Here we REVOKE the
-- table-wide SELECT and GRANT SELECT on every column EXCEPT the secrets.
-- Edge functions use service_role and are unaffected. RLS is unchanged.
--
-- NOTE for future migrations: a column added to one of these tables is NOT
-- readable by anon/authenticated until you GRANT SELECT (col) explicitly.
-- Clients must list columns explicitly (select('*') now fails on these tables).

-- Safe "is configured" flag so the UI never needs the Meta CAPI token itself.
ALTER TABLE public.ad_integrations
  ADD COLUMN IF NOT EXISTS has_access_token boolean
  GENERATED ALWAYS AS (access_token IS NOT NULL AND access_token <> '') STORED;

DO $$
DECLARE
  spec jsonb := '{
    "ad_connections":              ["access_token","refresh_token"],
    "ad_integrations":             ["access_token"],
    "api_keys":                    ["key_hash"],
    "api_webhooks":                ["secret","secret_id"],
    "creator_platform_oauth":      ["access_token","refresh_token"],
    "creator_shopify_stores":      ["access_token"],
    "creator_stream_destinations": ["stream_key_encrypted","stream_key_vault_id"],
    "dsp_connections":             ["access_token","refresh_token"],
    "mux_live_streams":            ["stream_key"],
    "presave_subscribers":         ["spotify_access_token","spotify_refresh_token","apple_music_user_token"],
    "smart_link_presaves":         ["spotify_access_token","spotify_refresh_token","apple_music_user_token"]
  }';
  t text;
  safe text;
BEGIN
  FOR t IN SELECT jsonb_object_keys(spec) LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'skip missing table %', t; CONTINUE;
    END IF;
    SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinal_position) INTO safe
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = t
       AND NOT (spec -> t) ? c.column_name;
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO anon, authenticated', safe, t);
  END LOOP;
END $$;
