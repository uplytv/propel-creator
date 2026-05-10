
-- Friend music activity feed: returns recent likes/reposts/plays from users
-- the viewer follows. SECURITY DEFINER bypasses owner-only RLS on the
-- underlying tables but is scoped to the viewer's follow graph.

CREATE OR REPLACE FUNCTION public.get_friend_music_activity(
  _viewer uuid,
  _limit integer DEFAULT 30
)
RETURNS TABLE (
  activity_type text,
  actor_id uuid,
  actor_display_name text,
  actor_username text,
  actor_avatar_url text,
  track_id uuid,
  track_title text,
  track_cover_art_url text,
  track_genre text,
  track_creator_id uuid,
  track_audio_status text,
  track_mux_playback_id text,
  track_duration_seconds integer,
  occurred_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH friends AS (
    SELECT following_id AS uid FROM public.follows WHERE follower_id = _viewer
  ),
  likes AS (
    SELECT 'liked'::text AS activity_type, l.user_id AS actor_id,
           l.track_id, l.created_at AS occurred_at
    FROM public.track_likes l
    JOIN friends f ON f.uid = l.user_id
    ORDER BY l.created_at DESC
    LIMIT _limit
  ),
  reposts AS (
    SELECT 'reposted'::text AS activity_type, r.user_id AS actor_id,
           r.track_id, r.created_at AS occurred_at
    FROM public.track_reposts r
    JOIN friends f ON f.uid = r.user_id
    ORDER BY r.created_at DESC
    LIMIT _limit
  ),
  plays AS (
    -- one row per (user, track) keeping latest play
    SELECT DISTINCT ON (p.user_id, p.track_id)
           'played'::text AS activity_type, p.user_id AS actor_id,
           p.track_id, p.played_at AS occurred_at
    FROM public.music_recently_played p
    JOIN friends f ON f.uid = p.user_id
    WHERE p.played_at > now() - interval '14 days'
    ORDER BY p.user_id, p.track_id, p.played_at DESC
  ),
  combined AS (
    SELECT * FROM likes
    UNION ALL SELECT * FROM reposts
    UNION ALL SELECT * FROM plays
  )
  SELECT c.activity_type,
         c.actor_id,
         pr.display_name AS actor_display_name,
         pr.username AS actor_username,
         pr.avatar_url AS actor_avatar_url,
         t.id AS track_id,
         t.title AS track_title,
         t.cover_art_url AS track_cover_art_url,
         t.genre AS track_genre,
         t.creator_id AS track_creator_id,
         t.audio_status::text AS track_audio_status,
         t.audio_mux_playback_id AS track_mux_playback_id,
         t.duration_seconds AS track_duration_seconds,
         c.occurred_at
  FROM combined c
  JOIN public.tracks t ON t.id = c.track_id AND t.is_published = true
  LEFT JOIN public.profiles pr ON pr.user_id = c.actor_id
  ORDER BY c.occurred_at DESC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.get_friend_music_activity(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friend_music_activity(uuid, integer) TO authenticated;
