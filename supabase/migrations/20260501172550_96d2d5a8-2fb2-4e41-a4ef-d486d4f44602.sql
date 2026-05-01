-- AD CONNECTIONS
CREATE TABLE IF NOT EXISTS public.ad_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta','google','tiktok')),
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  account_data jsonb,
  selected_ad_account_id text,
  selected_page_id text,
  selected_ig_account_id text,
  selected_pixel_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.ad_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ad connections"
  ON public.ad_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ad connections"
  ON public.ad_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ad connections"
  ON public.ad_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own ad connections"
  ON public.ad_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER ad_connections_updated_at
  BEFORE UPDATE ON public.ad_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ad_connections_user_provider
  ON public.ad_connections(user_id, provider);

-- AD CAMPAIGNS PUBLISHED
CREATE TABLE IF NOT EXISTS public.ad_campaigns_published (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  builder_draft_id uuid,
  provider text NOT NULL CHECK (provider IN ('meta','google','tiktok')),
  external_campaign_id text NOT NULL,
  external_adset_id text,
  external_ad_id text,
  status text NOT NULL,
  brief jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz
);

ALTER TABLE public.ad_campaigns_published ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own published campaigns"
  ON public.ad_campaigns_published FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own published campaigns"
  ON public.ad_campaigns_published FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own published campaigns"
  ON public.ad_campaigns_published FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own published campaigns"
  ON public.ad_campaigns_published FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_published_user
  ON public.ad_campaigns_published(user_id, provider);