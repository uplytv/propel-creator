-- =========================================================
-- Music module (additive only). All tables RLS enabled.
-- =========================================================

-- Reuse existing trigger function public.update_updated_at_column()

CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  genre text,
  cover_art_url text,
  audio_mux_asset_id text,
  audio_mux_playback_id text,
  audio_upload_id text,
  audio_status text NOT NULL DEFAULT 'pending' CHECK (audio_status IN ('pending','processing','ready','errored')),
  duration_seconds integer,
  is_published boolean NOT NULL DEFAULT false,
  is_explicit boolean NOT NULL DEFAULT false,
  monetization_type text NOT NULL DEFAULT 'free' CHECK (monetization_type IN ('free','paid','subscriber_only')),
  play_count bigint NOT NULL DEFAULT 0,
  like_count bigint NOT NULL DEFAULT 0,
  release_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tracks_creator_pub_created ON public.tracks (creator_id, is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_genre_pub ON public.tracks (genre) WHERE is_published = true;
DROP TRIGGER IF EXISTS trg_tracks_updated_at ON public.tracks;
CREATE TRIGGER trg_tracks_updated_at BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "tracks_select_published_or_owner" ON public.tracks
  FOR SELECT USING (is_published = true OR auth.uid() = creator_id);
CREATE POLICY "tracks_insert_own" ON public.tracks
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "tracks_update_own" ON public.tracks
  FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "tracks_delete_own" ON public.tracks
  FOR DELETE USING (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_art_url text,
  album_type text NOT NULL DEFAULT 'single' CHECK (album_type IN ('single','ep','album')),
  release_date timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albums_select_published_or_owner" ON public.albums
  FOR SELECT USING (is_published = true OR auth.uid() = creator_id);
CREATE POLICY "albums_insert_own" ON public.albums
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "albums_update_own" ON public.albums
  FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "albums_delete_own" ON public.albums
  FOR DELETE USING (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS public.album_tracks (
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  track_number integer NOT NULL DEFAULT 1,
  PRIMARY KEY (album_id, track_id)
);
ALTER TABLE public.album_tracks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_album_tracks_album_num ON public.album_tracks (album_id, track_number);

CREATE POLICY "album_tracks_select_via_album" ON public.album_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = album_tracks.album_id
        AND (a.is_published = true OR a.creator_id = auth.uid())
    )
  );
CREATE POLICY "album_tracks_insert_owner" ON public.album_tracks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_tracks.album_id AND a.creator_id = auth.uid())
  );
CREATE POLICY "album_tracks_update_owner" ON public.album_tracks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_tracks.album_id AND a.creator_id = auth.uid())
  );
CREATE POLICY "album_tracks_delete_owner" ON public.album_tracks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_tracks.album_id AND a.creator_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.track_likes (
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);
ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track_likes_select_own" ON public.track_likes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "track_likes_insert_own" ON public.track_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "track_likes_delete_own" ON public.track_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Maintain like_count via triggers
CREATE OR REPLACE FUNCTION public.bump_track_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tracks SET like_count = COALESCE(like_count,0) + 1 WHERE id = NEW.track_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tracks SET like_count = GREATEST(0, COALESCE(like_count,0) - 1) WHERE id = OLD.track_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_track_likes_inc ON public.track_likes;
CREATE TRIGGER trg_track_likes_inc AFTER INSERT ON public.track_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_track_like_count();
DROP TRIGGER IF EXISTS trg_track_likes_dec ON public.track_likes;
CREATE TRIGGER trg_track_likes_dec AFTER DELETE ON public.track_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_track_like_count();

CREATE TABLE IF NOT EXISTS public.track_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id uuid,
  duration_played_seconds integer NOT NULL DEFAULT 0,
  played_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_plays ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_track_plays_track_played ON public.track_plays (track_id, played_at DESC);
CREATE POLICY "track_plays_select_own" ON public.track_plays
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "track_plays_insert_auth" ON public.track_plays
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE TABLE IF NOT EXISTS public.track_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  timestamp_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track_comments_select_via_track" ON public.track_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      WHERE t.id = track_comments.track_id
        AND (t.is_published = true OR t.creator_id = auth.uid())
    )
  );
CREATE POLICY "track_comments_insert_own" ON public.track_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "track_comments_update_own" ON public.track_comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "track_comments_delete_own" ON public.track_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.music_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_art_url text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "music_playlists_select_public_or_own" ON public.music_playlists
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "music_playlists_insert_own" ON public.music_playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "music_playlists_update_own" ON public.music_playlists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "music_playlists_delete_own" ON public.music_playlists
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.music_playlist_tracks (
  playlist_id uuid NOT NULL REFERENCES public.music_playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
);
ALTER TABLE public.music_playlist_tracks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_music_playlist_tracks_pos ON public.music_playlist_tracks (playlist_id, position);

CREATE POLICY "music_playlist_tracks_select_via_playlist" ON public.music_playlist_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.music_playlists p
      WHERE p.id = music_playlist_tracks.playlist_id
        AND (p.is_public = true OR p.user_id = auth.uid())
    )
  );
CREATE POLICY "music_playlist_tracks_insert_owner" ON public.music_playlist_tracks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.music_playlists p WHERE p.id = music_playlist_tracks.playlist_id AND p.user_id = auth.uid())
  );
CREATE POLICY "music_playlist_tracks_update_owner" ON public.music_playlist_tracks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.music_playlists p WHERE p.id = music_playlist_tracks.playlist_id AND p.user_id = auth.uid())
  );
CREATE POLICY "music_playlist_tracks_delete_owner" ON public.music_playlist_tracks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.music_playlists p WHERE p.id = music_playlist_tracks.playlist_id AND p.user_id = auth.uid())
  );

-- Storage bucket for cover art
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('music-art', 'music-art', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "music_art_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'music-art');
CREATE POLICY "music_art_user_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'music-art' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "music_art_user_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'music-art' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "music_art_user_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'music-art' AND (storage.foldername(name))[1] = auth.uid()::text);