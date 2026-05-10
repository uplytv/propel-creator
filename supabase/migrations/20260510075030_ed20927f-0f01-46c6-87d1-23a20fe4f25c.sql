CREATE OR REPLACE FUNCTION public.music_creator_overview(_artist_id UUID, _days INT DEFAULT 30)
RETURNS TABLE (
  day DATE,
  plays BIGINT,
  unique_listeners BIGINT,
  likes BIGINT,
  purchases BIGINT,
  revenue_cents BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH days AS (
    SELECT generate_series(
      (current_date - (_days - 1))::date,
      current_date,
      '1 day'::interval
    )::date AS day
  ),
  tr AS (SELECT id FROM tracks WHERE creator_id = _artist_id),
  p AS (
    SELECT date_trunc('day', tp.played_at)::date AS day,
           COUNT(*) AS plays,
           COUNT(DISTINCT tp.user_id) AS unique_listeners
    FROM track_plays tp
    WHERE tp.track_id IN (SELECT id FROM tr)
      AND tp.played_at >= current_date - (_days - 1)
    GROUP BY 1
  ),
  l AS (
    SELECT date_trunc('day', tl.created_at)::date AS day, COUNT(*) AS likes
    FROM track_likes tl
    WHERE tl.track_id IN (SELECT id FROM tr)
      AND tl.created_at >= current_date - (_days - 1)
    GROUP BY 1
  ),
  pu AS (
    SELECT date_trunc('day', tpu.created_at)::date AS day,
           COUNT(*) AS purchases,
           COALESCE(SUM(tpu.amount_cents), 0)::BIGINT AS revenue_cents
    FROM track_purchases tpu
    WHERE tpu.track_id IN (SELECT id FROM tr)
      AND tpu.created_at >= current_date - (_days - 1)
    GROUP BY 1
  )
  SELECT d.day,
         COALESCE(p.plays, 0),
         COALESCE(p.unique_listeners, 0),
         COALESCE(l.likes, 0),
         COALESCE(pu.purchases, 0),
         COALESCE(pu.revenue_cents, 0)
  FROM days d
  LEFT JOIN p ON p.day = d.day
  LEFT JOIN l ON l.day = d.day
  LEFT JOIN pu ON pu.day = d.day
  ORDER BY d.day;
$$;

CREATE OR REPLACE FUNCTION public.music_top_tracks(_artist_id UUID, _days INT DEFAULT 30, _limit INT DEFAULT 10)
RETURNS TABLE (
  track_id UUID,
  title TEXT,
  cover_art_url TEXT,
  plays BIGINT,
  unique_listeners BIGINT,
  likes BIGINT,
  purchases BIGINT,
  revenue_cents BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH tr AS (SELECT id, title, cover_art_url FROM tracks WHERE creator_id = _artist_id),
  p AS (
    SELECT tp.track_id, COUNT(*) AS plays, COUNT(DISTINCT tp.user_id) AS unique_listeners
    FROM track_plays tp
    WHERE tp.track_id IN (SELECT id FROM tr)
      AND tp.played_at >= current_date - (_days - 1)
    GROUP BY 1
  ),
  l AS (
    SELECT track_id, COUNT(*) AS likes FROM track_likes
    WHERE track_id IN (SELECT id FROM tr) AND created_at >= current_date - (_days - 1)
    GROUP BY 1
  ),
  pu AS (
    SELECT track_id, COUNT(*) AS purchases,
           COALESCE(SUM(amount_cents), 0)::BIGINT AS revenue_cents
    FROM track_purchases
    WHERE track_id IN (SELECT id FROM tr) AND created_at >= current_date - (_days - 1)
    GROUP BY 1
  )
  SELECT tr.id, tr.title, tr.cover_art_url,
         COALESCE(p.plays, 0),
         COALESCE(p.unique_listeners, 0),
         COALESCE(l.likes, 0),
         COALESCE(pu.purchases, 0),
         COALESCE(pu.revenue_cents, 0)
  FROM tr
  LEFT JOIN p ON p.track_id = tr.id
  LEFT JOIN l ON l.track_id = tr.id
  LEFT JOIN pu ON pu.track_id = tr.id
  ORDER BY COALESCE(p.plays, 0) DESC NULLS LAST
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.music_top_fans(_artist_id UUID, _days INT DEFAULT 30, _limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  plays BIGINT,
  likes BIGINT,
  purchases BIGINT,
  revenue_cents BIGINT,
  score BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH tr AS (SELECT id FROM tracks WHERE creator_id = _artist_id),
  p AS (
    SELECT user_id, COUNT(*) AS plays
    FROM track_plays
    WHERE track_id IN (SELECT id FROM tr) AND played_at >= current_date - (_days - 1) AND user_id IS NOT NULL
    GROUP BY 1
  ),
  l AS (
    SELECT user_id, COUNT(*) AS likes
    FROM track_likes
    WHERE track_id IN (SELECT id FROM tr) AND created_at >= current_date - (_days - 1)
    GROUP BY 1
  ),
  pu AS (
    SELECT buyer_id AS user_id, COUNT(*) AS purchases,
           COALESCE(SUM(amount_cents), 0)::BIGINT AS revenue_cents
    FROM track_purchases
    WHERE track_id IN (SELECT id FROM tr) AND created_at >= current_date - (_days - 1)
    GROUP BY 1
  ),
  u AS (
    SELECT user_id FROM p
    UNION SELECT user_id FROM l
    UNION SELECT user_id FROM pu
  )
  SELECT u.user_id,
         COALESCE(p.plays, 0),
         COALESCE(l.likes, 0),
         COALESCE(pu.purchases, 0),
         COALESCE(pu.revenue_cents, 0),
         (COALESCE(p.plays, 0) + 5 * COALESCE(l.likes, 0) + 50 * COALESCE(pu.purchases, 0))::BIGINT AS score
  FROM u
  LEFT JOIN p ON p.user_id = u.user_id
  LEFT JOIN l ON l.user_id = u.user_id
  LEFT JOIN pu ON pu.user_id = u.user_id
  ORDER BY score DESC
  LIMIT _limit;
$$;