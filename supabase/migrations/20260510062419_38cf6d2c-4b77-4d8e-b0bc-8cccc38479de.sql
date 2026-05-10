
-- Folders
CREATE TABLE IF NOT EXISTS public.music_playlist_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00FF85',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playlist_folders_user ON public.music_playlist_folders(user_id, position);

ALTER TABLE public.music_playlist_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own folders"
  ON public.music_playlist_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own folders"
  ON public.music_playlist_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own folders"
  ON public.music_playlist_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own folders"
  ON public.music_playlist_folders FOR DELETE USING (auth.uid() = user_id);

-- Add folder_id to playlists
ALTER TABLE public.music_playlists
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.music_playlist_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_playlists_folder ON public.music_playlists(folder_id);

-- Smart playlists
CREATE TABLE IF NOT EXISTS public.music_smart_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('liked','recently_played','top_played','genre','artist')),
  rule_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_art_url TEXT,
  folder_id UUID REFERENCES public.music_playlist_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_playlists_user ON public.music_smart_playlists(user_id);

ALTER TABLE public.music_smart_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own smart playlists"
  ON public.music_smart_playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own smart playlists"
  ON public.music_smart_playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own smart playlists"
  ON public.music_smart_playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own smart playlists"
  ON public.music_smart_playlists FOR DELETE USING (auth.uid() = user_id);

-- Downloads
CREATE TABLE IF NOT EXISTS public.music_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_downloads_user ON public.music_downloads(user_id, downloaded_at DESC);

ALTER TABLE public.music_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own downloads"
  ON public.music_downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own downloads"
  ON public.music_downloads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own downloads"
  ON public.music_downloads FOR DELETE USING (auth.uid() = user_id);

-- Resolve smart playlist for current user
CREATE OR REPLACE FUNCTION public.resolve_smart_playlist(_smart_id UUID, _limit INTEGER DEFAULT 100)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sp RECORD;
  caller UUID := auth.uid();
BEGIN
  SELECT * INTO sp FROM public.music_smart_playlists WHERE id = _smart_id;
  IF sp IS NULL OR sp.user_id <> caller THEN
    RETURN;
  END IF;

  IF sp.rule_type = 'liked' THEN
    RETURN QUERY
      SELECT tl.track_id FROM public.track_likes tl
      WHERE tl.user_id = caller
      ORDER BY tl.created_at DESC LIMIT _limit;
  ELSIF sp.rule_type = 'recently_played' THEN
    RETURN QUERY
      SELECT DISTINCT ON (mrp.track_id) mrp.track_id
      FROM public.music_recently_played mrp
      WHERE mrp.user_id = caller
      ORDER BY mrp.track_id, mrp.played_at DESC
      LIMIT _limit;
  ELSIF sp.rule_type = 'top_played' THEN
    RETURN QUERY
      SELECT mrp.track_id FROM public.music_recently_played mrp
      WHERE mrp.user_id = caller
      GROUP BY mrp.track_id
      ORDER BY COUNT(*) DESC
      LIMIT _limit;
  ELSIF sp.rule_type = 'genre' THEN
    RETURN QUERY
      SELECT t.id FROM public.tracks t
      WHERE t.genre = (sp.rule_params->>'genre')
      ORDER BY t.play_count DESC NULLS LAST
      LIMIT _limit;
  ELSIF sp.rule_type = 'artist' THEN
    RETURN QUERY
      SELECT t.id FROM public.tracks t
      WHERE t.creator_id = (sp.rule_params->>'artist_id')::uuid
      ORDER BY t.created_at DESC
      LIMIT _limit;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_smart_playlist(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_smart_playlist(UUID, INTEGER) TO authenticated;
