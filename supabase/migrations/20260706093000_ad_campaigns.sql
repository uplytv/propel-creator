-- Unified Ads Manager v1 — creator-owned ad campaign DRAFTS.
--
-- This table backs the new /ads-manager hub, which unifies UPLY's existing ad
-- surfaces (ad_connections OAuth, ad_integrations pixels, boost `campaigns`)
-- into one place to compose full ad campaigns for Google / Facebook / Instagram.
--
-- SCOPE / HONESTY: v1 stores DRAFTS only. Actually pushing a campaign live on
-- Google Ads or Meta requires the Google Ads API + Meta Marketing API developer
-- tokens and app review the owner must obtain. That platform API layer is
-- Phase 2. Until it exists:
--   * `external_id` stays NULL (it is the id the external platform assigns on
--     publish — its presence is the signal that a campaign is genuinely live).
--   * the 'published' status is reserved for the Phase 2 API layer to set; the
--     UI never fakes it. Drafts save fully; the Publish action stays disabled.
--
-- budget_daily_cents is stored in integer cents (no float money math).

CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('google', 'facebook', 'instagram')),
  objective text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published', 'paused', 'archived')),
  budget_daily_cents int,
  headline text,
  primary_text text,
  cta text,
  audience jsonb,
  creative_url text,
  external_id text,           -- nullable; set ONLY by the Phase 2 platform API layer on real publish
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_campaigns_creator ON public.ad_campaigns (creator_id, created_at DESC);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

-- A creator fully manages (select/insert/update/delete) only their own campaigns.
CREATE POLICY "Creators manage own ad campaigns"
  ON public.ad_campaigns
  FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;

-- Keep updated_at fresh on every UPDATE (shared project trigger fn).
CREATE TRIGGER update_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
