
ALTER TABLE public.music_playlists
  ADD COLUMN IF NOT EXISTS is_collaborative boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.music_playlist_collaborators (
  playlist_id uuid NOT NULL REFERENCES public.music_playlists(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_music_playlist_collaborators_user
  ON public.music_playlist_collaborators (user_id);

ALTER TABLE public.music_playlist_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playlist_collab_select" ON public.music_playlist_collaborators;
CREATE POLICY "playlist_collab_select"
  ON public.music_playlist_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.music_playlists p
      WHERE p.id = music_playlist_collaborators.playlist_id
        AND (p.is_public = true OR p.user_id = auth.uid()
             OR music_playlist_collaborators.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "playlist_collab_insert_owner" ON public.music_playlist_collaborators;
CREATE POLICY "playlist_collab_insert_owner"
  ON public.music_playlist_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.music_playlists p
      WHERE p.id = music_playlist_collaborators.playlist_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "playlist_collab_delete_owner_or_self" ON public.music_playlist_collaborators;
CREATE POLICY "playlist_collab_delete_owner_or_self"
  ON public.music_playlist_collaborators FOR DELETE
  USING (
    music_playlist_collaborators.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.music_playlists p
      WHERE p.id = music_playlist_collaborators.playlist_id
        AND p.user_id = auth.uid()
    )
  );

-- Allow collaborators to mutate tracks on collaborative playlists.
DROP POLICY IF EXISTS "music_playlist_tracks_insert_owner" ON public.music_playlist_tracks;
CREATE POLICY "music_playlist_tracks_insert_owner_or_collab"
  ON public.music_playlist_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.music_playlists p
      WHERE p.id = music_playlist_tracks.playlist_id
        AND (
          p.user_id = auth.uid()
          OR (
            p.is_collaborative = true
            AND EXISTS (
              SELECT 1 FROM public.music_playlist_collaborators c
              WHERE c.playlist_id = p.id AND c.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "music_playlist_tracks_delete_owner" ON public.music_playlist_tracks;
CREATE POLICY "music_playlist_tracks_delete_owner_or_collab"
  ON public.music_playlist_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.music_playlists p
      WHERE p.id = music_playlist_tracks.playlist_id
        AND (
          p.user_id = auth.uid()
          OR (
            p.is_collaborative = true
            AND EXISTS (
              SELECT 1 FROM public.music_playlist_collaborators c
              WHERE c.playlist_id = p.id AND c.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "music_playlist_tracks_update_owner" ON public.music_playlist_tracks;
CREATE POLICY "music_playlist_tracks_update_owner_or_collab"
  ON public.music_playlist_tracks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.music_playlists p
      WHERE p.id = music_playlist_tracks.playlist_id
        AND (
          p.user_id = auth.uid()
          OR (
            p.is_collaborative = true
            AND EXISTS (
              SELECT 1 FROM public.music_playlist_collaborators c
              WHERE c.playlist_id = p.id AND c.user_id = auth.uid()
            )
          )
        )
    )
  );

-- Blend helper: mix two users' top tracks into a single ordered list.
CREATE OR REPLACE FUNCTION public.get_music_blend(
  _user_a uuid,
  _user_b uuid,
  _limit  integer DEFAULT 30
)
RETURNS TABLE (
  track_id uuid,
  source text,
  score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH a_top AS (
    SELECT track_id, count(*)::numeric AS plays
    FROM public.music_recently_played
    WHERE user_id = _user_a AND played_at > now() - interval '60 days'
    GROUP BY track_id
  ),
  b_top AS (
    SELECT track_id, count(*)::numeric AS plays
    FROM public.music_recently_played
    WHERE user_id = _user_b AND played_at > now() - interval '60 days'
    GROUP BY track_id
  ),
  a_likes AS (
    SELECT track_id FROM public.track_likes WHERE user_id = _user_a
  ),
  b_likes AS (
    SELECT track_id FROM public.track_likes WHERE user_id = _user_b
  ),
  combined AS (
    SELECT t.id AS track_id,
           CASE
             WHEN at.track_id IS NOT NULL AND bt.track_id IS NOT NULL THEN 'shared'
             WHEN at.track_id IS NOT NULL OR al.track_id IS NOT NULL THEN 'a'
             ELSE 'b'
           END AS source,
           coalesce(at.plays, 0) + coalesce(bt.plays, 0)
             + (CASE WHEN al.track_id IS NOT NULL THEN 2 ELSE 0 END)
             + (CASE WHEN bl.track_id IS NOT NULL THEN 2 ELSE 0 END)
             + (CASE WHEN at.track_id IS NOT NULL AND bt.track_id IS NOT NULL THEN 5 ELSE 0 END)
             AS score
    FROM public.tracks t
    LEFT JOIN a_top at ON at.track_id = t.id
    LEFT JOIN b_top bt ON bt.track_id = t.id
    LEFT JOIN a_likes al ON al.track_id = t.id
    LEFT JOIN b_likes bl ON bl.track_id = t.id
    WHERE t.is_published = true
      AND (at.track_id IS NOT NULL OR bt.track_id IS NOT NULL
           OR al.track_id IS NOT NULL OR bl.track_id IS NOT NULL)
  )
  SELECT track_id, source, score
  FROM combined
  ORDER BY score DESC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.get_music_blend(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_music_blend(uuid, uuid, integer) TO authenticated;
