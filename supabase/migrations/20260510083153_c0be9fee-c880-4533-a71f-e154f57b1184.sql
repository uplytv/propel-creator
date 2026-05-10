
CREATE TABLE public.music_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  contributor_id UUID,
  language TEXT NOT NULL DEFAULT 'en',
  plain_text TEXT,
  synced_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_karaoke_ready BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track_id, language)
);

CREATE TABLE public.music_lyric_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lyric_id UUID NOT NULL REFERENCES public.music_lyrics(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  translated_synced_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  contributor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lyric_id, language)
);

CREATE TABLE public.music_karaoke_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id UUID NOT NULL,
  lyric_id UUID,
  score INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  recording_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_music_lyrics_track ON public.music_lyrics(track_id);
CREATE INDEX idx_music_lyric_translations_lyric ON public.music_lyric_translations(lyric_id);
CREATE INDEX idx_music_karaoke_sessions_user ON public.music_karaoke_sessions(user_id, created_at DESC);
CREATE INDEX idx_music_karaoke_sessions_track ON public.music_karaoke_sessions(track_id);

ALTER TABLE public.music_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_lyric_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_karaoke_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published lyrics are public"
  ON public.music_lyrics FOR SELECT USING (is_published = true OR auth.uid() = contributor_id);

CREATE POLICY "Contributors manage their lyrics"
  ON public.music_lyrics FOR ALL
  USING (auth.uid() = contributor_id)
  WITH CHECK (auth.uid() = contributor_id);

CREATE POLICY "Translations are public when parent is published"
  ON public.music_lyric_translations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.music_lyrics l WHERE l.id = lyric_id AND (l.is_published = true OR l.contributor_id = auth.uid())));

CREATE POLICY "Contributors manage their translations"
  ON public.music_lyric_translations FOR ALL
  USING (auth.uid() = contributor_id)
  WITH CHECK (auth.uid() = contributor_id);

CREATE POLICY "Users view own karaoke sessions"
  ON public.music_karaoke_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own karaoke sessions"
  ON public.music_karaoke_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own karaoke sessions"
  ON public.music_karaoke_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own karaoke sessions"
  ON public.music_karaoke_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_music_lyrics_updated_at
  BEFORE UPDATE ON public.music_lyrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_music_lyric_translations_updated_at
  BEFORE UPDATE ON public.music_lyric_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
