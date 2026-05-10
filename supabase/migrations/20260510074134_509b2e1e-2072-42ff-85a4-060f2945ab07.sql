CREATE TABLE IF NOT EXISTS public.music_context_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('time_of_day','weather','activity')),
  context_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  seed_genres TEXT[] NOT NULL DEFAULT '{}',
  seed_moods TEXT[] NOT NULL DEFAULT '{}',
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_context_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "context playlists viewable by all"
  ON public.music_context_playlists FOR SELECT USING (true);
CREATE POLICY "owners insert context playlists"
  ON public.music_context_playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update context playlists"
  ON public.music_context_playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete context playlists"
  ON public.music_context_playlists FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ctxpl_user ON public.music_context_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_ctxpl_type ON public.music_context_playlists(context_type);

CREATE TRIGGER trg_ctxpl_updated
  BEFORE UPDATE ON public.music_context_playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();