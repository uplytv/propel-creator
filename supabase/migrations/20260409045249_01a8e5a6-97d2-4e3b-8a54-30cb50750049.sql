-- Store creator OAuth tokens for social platforms
CREATE TABLE IF NOT EXISTS public.creator_platform_oauth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  platform text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  platform_user_id text,
  platform_username text,
  platform_channel_name text,
  scopes text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  connected_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(creator_id, platform)
);
ALTER TABLE public.creator_platform_oauth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own oauth" ON public.creator_platform_oauth
  FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- Track distribution job status per video per platform
CREATE TABLE IF NOT EXISTS public.content_distribution_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  content_id uuid NOT NULL,
  content_type text NOT NULL DEFAULT 'recording',
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  platform_post_id text,
  platform_url text,
  title text,
  description text,
  error_message text,
  queued_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.content_distribution_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own jobs" ON public.content_distribution_jobs
  FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.content_distribution_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_platform_oauth;

-- Add distribution preferences columns
ALTER TABLE public.aria_distribution_settings
  ADD COLUMN IF NOT EXISTS auto_distribute_recordings boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_distribute_videos boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS n8n_enabled boolean DEFAULT true;