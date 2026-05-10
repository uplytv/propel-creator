
CREATE TABLE IF NOT EXISTS public.track_lyric_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL,
  language text NOT NULL,
  lrc_text text,
  lyrics_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, language)
);

ALTER TABLE public.track_lyric_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Translations are viewable by everyone"
  ON public.track_lyric_translations FOR SELECT USING (true);

CREATE POLICY "Track owners manage translations"
  ON public.track_lyric_translations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.karaoke_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score int NOT NULL CHECK (score >= 0 AND score <= 100),
  lines_hit int NOT NULL DEFAULT 0,
  total_lines int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_karaoke_scores_track ON public.karaoke_scores(track_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_karaoke_scores_user ON public.karaoke_scores(user_id, created_at DESC);

ALTER TABLE public.karaoke_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own karaoke scores"
  ON public.karaoke_scores FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid())
  );

CREATE POLICY "Users insert own karaoke scores"
  ON public.karaoke_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own karaoke scores"
  ON public.karaoke_scores FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_track_lyric_translations_updated
  BEFORE UPDATE ON public.track_lyric_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
