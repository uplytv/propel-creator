-- White-label branding — Phase 1 ("Branded").
-- Per-creator brand applied on that creator's own member-facing surfaces
-- (their space, profile, etc.). No custom domains yet (Phase 2).

CREATE TABLE IF NOT EXISTS public.whitelabel_config (
  creator_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name    text,
  logo_url      text,
  primary_hsl   text,          -- e.g. '219 100% 62%' (applied to the --primary token)
  accent_hsl    text,          -- gradient end, e.g. '280 85% 60%'
  support_email text,
  subdomain     text UNIQUE,   -- reserved for Phase 2 (custom domain)
  enabled       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whitelabel_config ENABLE ROW LEVEL SECURITY;

-- A creator fully manages their own brand row (even while disabled).
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

-- Anyone (incl. logged-out members) may read an ENABLED brand so the creator's
-- surfaces render their branding. Only branding fields are exposed.
DROP POLICY IF EXISTS "wl_public_read_enabled" ON public.whitelabel_config;
CREATE POLICY "wl_public_read_enabled" ON public.whitelabel_config
  FOR SELECT USING (enabled = true);

GRANT SELECT, INSERT, UPDATE ON public.whitelabel_config TO authenticated;
GRANT SELECT ON public.whitelabel_config TO anon;
