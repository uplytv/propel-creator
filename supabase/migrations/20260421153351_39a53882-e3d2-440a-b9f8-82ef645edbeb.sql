-- =========================
-- VIDEO CHAPTERS
-- =========================
CREATE TABLE IF NOT EXISTS public.video_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_seconds integer NOT NULL CHECK (start_seconds >= 0),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_chapters_video ON public.video_chapters(video_id, start_seconds);

ALTER TABLE public.video_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chapters viewable when video is public"
ON public.video_chapters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_chapters.video_id
      AND (v.is_public = true OR v.creator_id = auth.uid())
  )
);

CREATE POLICY "Creators manage their video chapters"
ON public.video_chapters FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_chapters.video_id AND v.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_chapters.video_id AND v.creator_id = auth.uid()
  )
);

-- =========================
-- PLAYLISTS
-- =========================
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Playlist',
  description text,
  cover_image_url text,
  is_public boolean NOT NULL DEFAULT true,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playlists_creator ON public.playlists(creator_id, created_at DESC);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public playlists viewable by all"
ON public.playlists FOR SELECT
USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Creators manage their playlists"
ON public.playlists FOR ALL
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- PLAYLIST ITEMS
-- =========================
CREATE TABLE IF NOT EXISTS public.playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_pl ON public.playlist_items(playlist_id, position);

ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items viewable when playlist is public"
ON public.playlist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_items.playlist_id
      AND (p.is_public = true OR p.creator_id = auth.uid())
  )
);

CREATE POLICY "Owners manage playlist items"
ON public.playlist_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_items.playlist_id AND p.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_items.playlist_id AND p.creator_id = auth.uid()
  )
);

-- Maintain item_count
CREATE OR REPLACE FUNCTION public.recalc_playlist_item_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  pid := COALESCE(NEW.playlist_id, OLD.playlist_id);
  UPDATE public.playlists
    SET item_count = (SELECT COUNT(*) FROM public.playlist_items WHERE playlist_id = pid),
        updated_at = now()
    WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_playlist_items_count ON public.playlist_items;
CREATE TRIGGER trg_playlist_items_count
AFTER INSERT OR DELETE ON public.playlist_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_playlist_item_count();