
-- Lyrics (one row per track)
CREATE TABLE IF NOT EXISTS public.track_lyrics (
  track_id UUID PRIMARY KEY REFERENCES public.tracks(id) ON DELETE CASCADE,
  lyrics_text TEXT,
  lrc_text TEXT,
  language TEXT DEFAULT 'en',
  source TEXT DEFAULT 'creator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.track_lyrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lyrics_read_all" ON public.track_lyrics;
CREATE POLICY "lyrics_read_all" ON public.track_lyrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "lyrics_owner_insert" ON public.track_lyrics;
CREATE POLICY "lyrics_owner_insert" ON public.track_lyrics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()));

DROP POLICY IF EXISTS "lyrics_owner_update" ON public.track_lyrics;
CREATE POLICY "lyrics_owner_update" ON public.track_lyrics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()));

DROP POLICY IF EXISTS "lyrics_owner_delete" ON public.track_lyrics;
CREATE POLICY "lyrics_owner_delete" ON public.track_lyrics FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()));

CREATE TRIGGER trg_track_lyrics_updated_at
  BEFORE UPDATE ON public.track_lyrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reposts
CREATE TABLE IF NOT EXISTS public.track_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);
ALTER TABLE public.track_reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reposts_read_all" ON public.track_reposts;
CREATE POLICY "reposts_read_all" ON public.track_reposts FOR SELECT USING (true);

DROP POLICY IF EXISTS "reposts_owner_insert" ON public.track_reposts;
CREATE POLICY "reposts_owner_insert" ON public.track_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reposts_owner_delete" ON public.track_reposts;
CREATE POLICY "reposts_owner_delete" ON public.track_reposts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_track_reposts_user ON public.track_reposts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_reposts_track ON public.track_reposts(track_id);

-- Recently played (server-side history; many rows per user)
CREATE TABLE IF NOT EXISTS public.music_recently_played (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  position_seconds INTEGER DEFAULT 0
);
ALTER TABLE public.music_recently_played ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recent_owner_read" ON public.music_recently_played;
CREATE POLICY "recent_owner_read" ON public.music_recently_played FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recent_owner_insert" ON public.music_recently_played;
CREATE POLICY "recent_owner_insert" ON public.music_recently_played FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recent_owner_delete" ON public.music_recently_played;
CREATE POLICY "recent_owner_delete" ON public.music_recently_played FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recent_user_time ON public.music_recently_played(user_id, played_at DESC);
