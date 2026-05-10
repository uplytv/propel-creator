CREATE TABLE IF NOT EXISTS public.music_longform (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'podcast' CHECK (kind IN ('podcast','mix','set','interview')),
  episode_number INTEGER,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  play_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_music_longform_artist ON public.music_longform(artist_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_longform_kind ON public.music_longform(kind, published_at DESC);
ALTER TABLE public.music_longform ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Longform: public read published" ON public.music_longform FOR SELECT USING (is_published = true OR auth.uid() = artist_id);
CREATE POLICY "Longform: artist insert" ON public.music_longform FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Longform: artist update" ON public.music_longform FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Longform: artist delete" ON public.music_longform FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER music_longform_updated_at BEFORE UPDATE ON public.music_longform
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.music_longform_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id UUID NOT NULL REFERENCES public.music_longform(id) ON DELETE CASCADE,
  start_seconds INTEGER NOT NULL CHECK (start_seconds >= 0),
  title TEXT NOT NULL,
  artwork_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chapters_episode ON public.music_longform_chapters(episode_id, start_seconds);
ALTER TABLE public.music_longform_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chapters: public read" ON public.music_longform_chapters FOR SELECT USING (true);
CREATE POLICY "Chapters: artist manage" ON public.music_longform_chapters FOR ALL
  USING (EXISTS (SELECT 1 FROM public.music_longform e WHERE e.id = episode_id AND e.artist_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.music_longform e WHERE e.id = episode_id AND e.artist_id = auth.uid()));

-- Per-user playback progress
CREATE TABLE IF NOT EXISTS public.music_longform_progress (
  user_id UUID NOT NULL,
  episode_id UUID NOT NULL REFERENCES public.music_longform(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, episode_id)
);
ALTER TABLE public.music_longform_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Progress: own read" ON public.music_longform_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Progress: own write" ON public.music_longform_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Progress: own update" ON public.music_longform_progress FOR UPDATE USING (auth.uid() = user_id);