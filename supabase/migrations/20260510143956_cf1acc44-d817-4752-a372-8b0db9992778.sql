CREATE TABLE IF NOT EXISTS public.music_podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  episode_number INTEGER,
  season_number INTEGER DEFAULT 1,
  cover_image_url TEXT,
  show_name TEXT,
  published_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_explicit BOOLEAN NOT NULL DEFAULT false,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mpe_artist ON public.music_podcast_episodes(artist_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_mpe_published ON public.music_podcast_episodes(is_published, published_at DESC);

ALTER TABLE public.music_podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views published episodes"
ON public.music_podcast_episodes FOR SELECT
USING (is_published = true OR auth.uid() = artist_id);

CREATE POLICY "Artists insert own episodes"
ON public.music_podcast_episodes FOR INSERT
WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists update own episodes"
ON public.music_podcast_episodes FOR UPDATE
USING (auth.uid() = artist_id);

CREATE POLICY "Artists delete own episodes"
ON public.music_podcast_episodes FOR DELETE
USING (auth.uid() = artist_id);

CREATE TRIGGER trg_mpe_updated_at
BEFORE UPDATE ON public.music_podcast_episodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_podcast_episode_plays(_episode_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.music_podcast_episodes SET play_count = play_count + 1 WHERE id = _episode_id;
$$;