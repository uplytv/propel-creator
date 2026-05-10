
CREATE TABLE IF NOT EXISTS public.music_listening_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  track_id uuid NOT NULL,
  fan_id uuid NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  device_type text CHECK (device_type IN ('mobile','desktop','tablet','tv','other')) DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mls_artist ON public.music_listening_sessions(artist_id);
CREATE INDEX IF NOT EXISTS idx_mls_track ON public.music_listening_sessions(track_id);
CREATE INDEX IF NOT EXISTS idx_mls_fan ON public.music_listening_sessions(fan_id);

ALTER TABLE public.music_listening_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fans view own sessions" ON public.music_listening_sessions;
CREATE POLICY "Fans view own sessions" ON public.music_listening_sessions
  FOR SELECT USING (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Artists view their track sessions" ON public.music_listening_sessions;
CREATE POLICY "Artists view their track sessions" ON public.music_listening_sessions
  FOR SELECT USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Fans insert own sessions" ON public.music_listening_sessions;
CREATE POLICY "Fans insert own sessions" ON public.music_listening_sessions
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Fans update own sessions" ON public.music_listening_sessions;
CREATE POLICY "Fans update own sessions" ON public.music_listening_sessions
  FOR UPDATE USING (auth.uid() = fan_id);
