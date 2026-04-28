-- Add CAPI fields to existing ad_integrations
ALTER TABLE public.ad_integrations
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS test_event_code TEXT;

-- Campaign briefs
CREATE TABLE IF NOT EXISTS public.smart_link_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  smart_link_id UUID REFERENCES public.smart_links(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT 'TRAFFIC' CHECK (objective IN ('TRAFFIC','CONVERSIONS','REACH','VIDEO_VIEWS','ENGAGEMENT','APP_INSTALLS')),
  platform TEXT NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta','google','tiktok')),
  daily_budget NUMERIC NOT NULL DEFAULT 20,
  total_budget NUMERIC,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
  creative JSONB NOT NULL DEFAULT '{}'::jsonb,
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','exported','active','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_link_campaigns_creator ON public.smart_link_campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_smart_link_campaigns_link ON public.smart_link_campaigns(smart_link_id);

ALTER TABLE public.smart_link_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own campaigns" ON public.smart_link_campaigns
  FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators insert own campaigns" ON public.smart_link_campaigns
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update own campaigns" ON public.smart_link_campaigns
  FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators delete own campaigns" ON public.smart_link_campaigns
  FOR DELETE USING (auth.uid() = creator_id);

CREATE TRIGGER update_smart_link_campaigns_updated_at
  BEFORE UPDATE ON public.smart_link_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CAPI event log
CREATE TABLE IF NOT EXISTS public.smart_link_capi_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES public.smart_links(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  pixel_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capi_events_link ON public.smart_link_capi_events(link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capi_events_creator ON public.smart_link_capi_events(creator_id);

ALTER TABLE public.smart_link_capi_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own CAPI events" ON public.smart_link_capi_events
  FOR SELECT USING (auth.uid() = creator_id);