
-- Stores all Mux video assets (uploaded/recorded content)
CREATE TABLE public.mux_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mux_asset_id text UNIQUE NOT NULL,
  mux_playback_id text,
  upload_id text,
  status text DEFAULT 'preparing',
  duration decimal,
  aspect_ratio text,
  title text,
  description text,
  thumbnail_url text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stores live stream configurations per creator
CREATE TABLE public.mux_live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mux_stream_id text UNIQUE NOT NULL,
  mux_playback_id text,
  stream_key text,
  status text DEFAULT 'idle',
  title text,
  description text,
  category text,
  is_public boolean DEFAULT true,
  viewer_count integer DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stores individual live stream sessions for history/analytics
CREATE TABLE public.live_stream_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.mux_live_streams(id) ON DELETE CASCADE,
  user_id uuid,
  mux_asset_id text,
  peak_viewers integer DEFAULT 0,
  total_watch_minutes integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- RLS for mux_assets
ALTER TABLE public.mux_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assets" ON public.mux_assets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public assets visible to all" ON public.mux_assets
  FOR SELECT USING (is_public = true);

-- RLS for mux_live_streams
ALTER TABLE public.mux_live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own streams" ON public.mux_live_streams
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public streams visible to all" ON public.mux_live_streams
  FOR SELECT USING (is_public = true);

-- RLS for live_stream_sessions
ALTER TABLE public.live_stream_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.live_stream_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Enable realtime for live streams
ALTER PUBLICATION supabase_realtime ADD TABLE public.mux_live_streams;
