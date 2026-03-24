
-- ARIA Content Engine tables
CREATE TABLE IF NOT EXISTS public.aria_content_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  source_title text,
  source_duration_seconds integer,
  transcript_id uuid,
  status text DEFAULT 'queued',
  progress integer DEFAULT 0,
  outputs jsonb DEFAULT '[]',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aria_generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.aria_content_jobs(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  content_type text NOT NULL,
  title text,
  body text,
  metadata jsonb DEFAULT '{}',
  mux_clip_asset_id text,
  mux_clip_playback_id text,
  status text DEFAULT 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  platform text,
  performance_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aria_distribution_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.aria_generated_content(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  platform text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'pending',
  result jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aria_distribution_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE,
  auto_post_community boolean DEFAULT true,
  auto_send_email_blast boolean DEFAULT false,
  auto_post_tiktok boolean DEFAULT false,
  auto_post_instagram boolean DEFAULT false,
  auto_post_youtube_shorts boolean DEFAULT false,
  auto_post_twitter boolean DEFAULT false,
  auto_post_linkedin boolean DEFAULT false,
  posting_schedule text DEFAULT 'immediate',
  require_approval boolean DEFAULT true,
  auto_process_new_content boolean DEFAULT true,
  max_clips_per_job integer DEFAULT 10,
  min_clip_seconds integer DEFAULT 20,
  max_clip_seconds integer DEFAULT 60,
  content_tone text DEFAULT 'mix',
  primary_platform text DEFAULT 'all',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.aria_content_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_distribution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_distribution_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own jobs" ON public.aria_content_jobs FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Users manage own content" ON public.aria_generated_content FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Users manage own queue" ON public.aria_distribution_queue FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Users manage own settings" ON public.aria_distribution_settings FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.aria_content_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aria_generated_content;

-- Indexes
CREATE INDEX idx_aria_jobs_creator ON public.aria_content_jobs(creator_id);
CREATE INDEX idx_aria_jobs_status ON public.aria_content_jobs(status);
CREATE INDEX idx_aria_content_job ON public.aria_generated_content(job_id);
CREATE INDEX idx_aria_content_creator ON public.aria_generated_content(creator_id);
CREATE INDEX idx_aria_queue_status ON public.aria_distribution_queue(status, scheduled_at);
