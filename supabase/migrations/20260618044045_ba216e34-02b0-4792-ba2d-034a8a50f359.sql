
CREATE TABLE IF NOT EXISTS public.whitelabel_config (
  creator_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name             text,
  logo_url               text,
  primary_hsl            text,
  accent_hsl             text,
  support_email          text,
  subdomain              text UNIQUE,
  enabled                boolean NOT NULL DEFAULT false,
  whitelabel_active      boolean NOT NULL DEFAULT false,
  stripe_subscription_id text,
  subscription_status    text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.whitelabel_config TO authenticated;
GRANT SELECT ON public.whitelabel_config TO anon;
GRANT ALL ON public.whitelabel_config TO service_role;

ALTER TABLE public.whitelabel_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_owner_select" ON public.whitelabel_config;
CREATE POLICY "wl_owner_select" ON public.whitelabel_config
  FOR SELECT TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "wl_owner_insert" ON public.whitelabel_config;
CREATE POLICY "wl_owner_insert" ON public.whitelabel_config
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "wl_owner_update" ON public.whitelabel_config;
CREATE POLICY "wl_owner_update" ON public.whitelabel_config
  FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "wl_public_read_enabled" ON public.whitelabel_config;
CREATE POLICY "wl_public_read_enabled" ON public.whitelabel_config
  FOR SELECT USING (enabled = true);

-- Trigger: only service_role can change whitelabel_active; enabled is auto-forced
-- false when activation is off. updated_at is bumped on every change.
CREATE OR REPLACE FUNCTION public.whitelabel_enforce_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_active boolean;
  is_service  boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    prev_active := OLD.whitelabel_active;
  ELSE
    prev_active := false;
  END IF;

  is_service := coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';

  IF NEW.whitelabel_active IS DISTINCT FROM prev_active AND NOT is_service THEN
    NEW.whitelabel_active := prev_active;
  END IF;

  IF NEW.whitelabel_active = false THEN
    NEW.enabled := false;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS whitelabel_enforce_activation_trg ON public.whitelabel_config;
CREATE TRIGGER whitelabel_enforce_activation_trg
  BEFORE INSERT OR UPDATE ON public.whitelabel_config
  FOR EACH ROW EXECUTE FUNCTION public.whitelabel_enforce_activation();
