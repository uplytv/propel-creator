-- Smart (dynamic) playlists
CREATE TABLE IF NOT EXISTS public.music_smart_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('liked','recently_played','top_played','genre','artist')),
  rule_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_art_url TEXT,
  folder_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_smart_playlists ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "msp_select_own" ON public.music_smart_playlists FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "msp_insert_own" ON public.music_smart_playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "msp_update_own" ON public.music_smart_playlists FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "msp_delete_own" ON public.music_smart_playlists FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_msp_user ON public.music_smart_playlists(user_id);

DO $$ BEGIN
  CREATE TRIGGER trg_msp_updated_at BEFORE UPDATE ON public.music_smart_playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Resolver: returns ordered track ids for a smart playlist
CREATE OR REPLACE FUNCTION public.resolve_smart_playlist(_smart_id UUID, _limit INT DEFAULT 100)
RETURNS TABLE(track_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sp public.music_smart_playlists%ROWTYPE;
BEGIN
  SELECT * INTO sp FROM public.music_smart_playlists WHERE id = _smart_id;
  IF sp.id IS NULL THEN RETURN; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> sp.user_id THEN RETURN; END IF;

  IF sp.rule_type = 'liked' THEN
    RETURN QUERY
      SELECT tl.track_id FROM public.track_likes tl
      WHERE tl.user_id = sp.user_id
      ORDER BY tl.created_at DESC
      LIMIT _limit;
  ELSIF sp.rule_type = 'recently_played' THEN
    RETURN QUERY
      SELECT DISTINCT ON (ph.track_id) ph.track_id
      FROM public.play_history ph
      WHERE ph.user_id = sp.user_id
      ORDER BY ph.track_id, ph.created_at DESC
      LIMIT _limit;
  ELSIF sp.rule_type = 'top_played' THEN
    RETURN QUERY
      SELECT ph.track_id
      FROM public.play_history ph
      WHERE ph.user_id = sp.user_id
      GROUP BY ph.track_id
      ORDER BY COUNT(*) DESC
      LIMIT _limit;
  ELSIF sp.rule_type = 'genre' THEN
    RETURN QUERY
      SELECT t.id FROM public.tracks t
      WHERE t.genre = COALESCE(sp.rule_params->>'genre','')
      ORDER BY t.created_at DESC
      LIMIT _limit;
  ELSIF sp.rule_type = 'artist' THEN
    RETURN QUERY
      SELECT t.id FROM public.tracks t
      WHERE t.artist_id = NULLIF(sp.rule_params->>'artist_id','')::uuid
      ORDER BY t.created_at DESC
      LIMIT _limit;
  END IF;
END;
$$;