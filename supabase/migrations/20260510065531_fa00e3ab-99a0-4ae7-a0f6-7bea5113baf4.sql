
-- Daily listener trends for a single track
CREATE OR REPLACE FUNCTION public.get_track_listener_trends(_track_id uuid, _days int DEFAULT 30)
RETURNS TABLE(day date, plays bigint, unique_listeners bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT artist_id INTO _owner FROM public.music_tracks WHERE id = _track_id;
  IF _owner IS NULL OR _owner <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    (date_trunc('day', played_at))::date AS day,
    COUNT(*)::bigint AS plays,
    COUNT(DISTINCT user_id)::bigint AS unique_listeners
  FROM public.music_recently_played
  WHERE track_id = _track_id
    AND played_at >= now() - (_days || ' days')::interval
  GROUP BY 1
  ORDER BY 1;
END;
$$;

-- Geo breakdown for a track
CREATE OR REPLACE FUNCTION public.get_track_geo_breakdown(_track_id uuid, _days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _countries jsonb;
  _cities jsonb;
BEGIN
  SELECT artist_id INTO _owner FROM public.music_tracks WHERE id = _track_id;
  IF _owner IS NULL OR _owner <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'listeners', listeners) ORDER BY listeners DESC), '[]'::jsonb)
  INTO _countries
  FROM (
    SELECT COALESCE(country, 'Unknown') AS country, COUNT(DISTINCT user_id)::int AS listeners
    FROM public.music_recently_played
    WHERE track_id = _track_id
      AND played_at >= now() - (_days || ' days')::interval
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('city', city, 'listeners', listeners) ORDER BY listeners DESC), '[]'::jsonb)
  INTO _cities
  FROM (
    SELECT COALESCE(city, 'Unknown') AS city, COUNT(DISTINCT user_id)::int AS listeners
    FROM public.music_recently_played
    WHERE track_id = _track_id
      AND played_at >= now() - (_days || ' days')::interval
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) ci;

  RETURN jsonb_build_object('countries', _countries, 'cities', _cities);
END;
$$;

-- Revenue dashboard for an artist
CREATE OR REPLACE FUNCTION public.get_creator_music_revenue(_artist_id uuid, _days int DEFAULT 30)
RETURNS TABLE(day date, sales_revenue numeric, tips_revenue numeric, total_revenue numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _artist_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      (current_date - (_days - 1))::date,
      current_date::date,
      '1 day'::interval
    )::date AS day
  ),
  sales AS (
    SELECT (date_trunc('day', tp.created_at))::date AS day,
           SUM(tp.amount_cents)::numeric / 100 AS revenue
    FROM public.music_track_purchases tp
    JOIN public.music_tracks t ON t.id = tp.track_id
    WHERE t.artist_id = _artist_id
      AND tp.status = 'completed'
      AND tp.created_at >= now() - (_days || ' days')::interval
    GROUP BY 1
  ),
  tips AS (
    SELECT (date_trunc('day', tt.created_at))::date AS day,
           SUM(tt.amount_cents)::numeric / 100 AS revenue
    FROM public.music_track_tips tt
    JOIN public.music_tracks t ON t.id = tt.track_id
    WHERE t.artist_id = _artist_id
      AND tt.status = 'completed'
      AND tt.created_at >= now() - (_days || ' days')::interval
    GROUP BY 1
  )
  SELECT d.day,
         COALESCE(s.revenue, 0) AS sales_revenue,
         COALESCE(tp.revenue, 0) AS tips_revenue,
         COALESCE(s.revenue, 0) + COALESCE(tp.revenue, 0) AS total_revenue
  FROM days d
  LEFT JOIN sales s ON s.day = d.day
  LEFT JOIN tips tp ON tp.day = d.day
  ORDER BY d.day;
END;
$$;
