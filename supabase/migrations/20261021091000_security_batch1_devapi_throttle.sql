-- Security batch 1 (2026-10-21), items 5 + 6.
-- Apply to a Supabase branch / staging first.

-------------------------------------------------------------------------------
-- 6) Developer API credentials are created server-side only
--    (edge function `developer-credentials`). Webhook secrets live in Vault.
-------------------------------------------------------------------------------
ALTER TABLE public.api_webhooks ADD COLUMN IF NOT EXISTS secret_id uuid;
ALTER TABLE public.api_webhooks ALTER COLUMN secret DROP NOT NULL;

-- Move any existing plaintext secrets into Vault, then clear the plaintext.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, secret FROM public.api_webhooks WHERE secret IS NOT NULL AND secret_id IS NULL LOOP
    UPDATE public.api_webhooks
       SET secret_id = vault.create_secret(r.secret, 'api_webhook_' || r.id::text, 'Developer API webhook signing secret'),
           secret = NULL
     WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_api_webhook_with_secret(
  _user_id uuid, _url text, _events text[], _secret text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault
AS $$
DECLARE _id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.api_webhooks (id, user_id, url, events, secret, secret_id)
  VALUES (_id, _user_id, _url, _events, NULL,
          vault.create_secret(_secret, 'api_webhook_' || _id::text, 'Developer API webhook signing secret'));
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.create_api_webhook_with_secret(uuid, text, text[], text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_api_webhook_with_secret(uuid, text, text[], text) TO service_role;

-- For a future webhook deliverer (service role only).
CREATE OR REPLACE FUNCTION public.get_api_webhook_secret(_webhook_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, vault
AS $$
  SELECT ds.decrypted_secret FROM public.api_webhooks w
  JOIN vault.decrypted_secrets ds ON ds.id = w.secret_id WHERE w.id = _webhook_id;
$$;
REVOKE ALL ON FUNCTION public.get_api_webhook_secret(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_api_webhook_secret(uuid) TO service_role;

-- Clients may read/disable/delete their own rows, but never insert or rewrite credentials.
REVOKE INSERT ON public.api_keys, public.api_webhooks FROM anon, authenticated;
REVOKE UPDATE ON public.api_keys, public.api_webhooks FROM anon, authenticated;
GRANT UPDATE (name, is_active) ON public.api_keys TO authenticated;
GRANT UPDATE (url, events, is_active) ON public.api_webhooks TO authenticated;
REVOKE SELECT (key_hash) ON public.api_keys FROM anon, authenticated;
REVOKE SELECT (secret, secret_id) ON public.api_webhooks FROM anon, authenticated;

-------------------------------------------------------------------------------
-- 5) Throttle anonymous public inserts (waitlist, public booking inquiries).
--    Captcha (Turnstile) still TODO: needs a site key/secret from Ari.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.throttle_public_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _email text := lower(coalesce(to_jsonb(NEW) ->> TG_ARGV[0], ''));
  _recent int;
  _same int;
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN RETURN NEW; END IF;

  EXECUTE format('SELECT count(*) FROM %I.%I WHERE created_at > now() - interval ''1 minute''',
                 TG_TABLE_SCHEMA, TG_TABLE_NAME) INTO _recent;
  IF _recent >= coalesce(TG_ARGV[1]::int, 30) THEN
    RAISE EXCEPTION 'Too many submissions, please try again shortly' USING ERRCODE = 'P0429';
  END IF;

  IF _email <> '' THEN
    EXECUTE format('SELECT count(*) FROM %I.%I WHERE lower(%I) = $1 AND created_at > now() - interval ''1 hour''',
                   TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_ARGV[0]) INTO _same USING _email;
    IF _same >= 3 THEN
      RAISE EXCEPTION 'Too many submissions for this email' USING ERRCODE = 'P0429';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_throttle_waitlist ON public.waitlist;
CREATE TRIGGER trg_throttle_waitlist BEFORE INSERT ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.throttle_public_insert('email', '30');

DO $$ BEGIN
  IF to_regclass('public.public_booking_inquiries') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_throttle_booking_inquiries ON public.public_booking_inquiries;
    CREATE TRIGGER trg_throttle_booking_inquiries BEFORE INSERT ON public.public_booking_inquiries
      FOR EACH ROW EXECUTE FUNCTION public.throttle_public_insert('contact_email', '20');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist (created_at);
DO $$ BEGIN
  IF to_regclass('public.public_booking_inquiries') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_public_booking_inquiries_created_at ON public.public_booking_inquiries (created_at);
  END IF;
END $$;
