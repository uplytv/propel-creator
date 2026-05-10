
CREATE TABLE IF NOT EXISTS public.track_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE UNIQUE,
  drop_at timestamptz NOT NULL,
  hype_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.track_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view drops"
  ON public.track_drops FOR SELECT USING (true);

CREATE POLICY "Track owner manages drops"
  ON public.track_drops FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_track_drops_drop_at ON public.track_drops(drop_at);

CREATE TABLE IF NOT EXISTS public.track_drop_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES public.track_drops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drop_id, user_id)
);

ALTER TABLE public.track_drop_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own reminders"
  ON public.track_drop_reminders FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Super-fan scoring (top fans per artist)
CREATE OR REPLACE FUNCTION public.get_super_fans(_artist_id uuid, _limit int DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  plays bigint,
  likes bigint,
  purchases bigint,
  score bigint,
  tier text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH plays_agg AS (
    SELECT tp.user_id, COUNT(*)::bigint AS plays
    FROM public.track_plays tp
    JOIN public.tracks t ON t.id = tp.track_id
    WHERE t.creator_id = _artist_id AND tp.user_id IS NOT NULL
    GROUP BY tp.user_id
  ),
  likes_agg AS (
    SELECT tl.user_id, COUNT(*)::bigint AS likes
    FROM public.track_likes tl
    JOIN public.tracks t ON t.id = tl.track_id
    WHERE t.creator_id = _artist_id
    GROUP BY tl.user_id
  ),
  purch_agg AS (
    SELECT tp.user_id, COUNT(*)::bigint AS purchases
    FROM public.track_purchases tp
    JOIN public.tracks t ON t.id = tp.track_id
    WHERE t.creator_id = _artist_id
    GROUP BY tp.user_id
  ),
  combined AS (
    SELECT
      COALESCE(p.user_id, l.user_id, pu.user_id) AS user_id,
      COALESCE(p.plays, 0) AS plays,
      COALESCE(l.likes, 0) AS likes,
      COALESCE(pu.purchases, 0) AS purchases
    FROM plays_agg p
    FULL OUTER JOIN likes_agg l ON l.user_id = p.user_id
    FULL OUTER JOIN purch_agg pu ON pu.user_id = COALESCE(p.user_id, l.user_id)
  )
  SELECT
    c.user_id,
    c.plays,
    c.likes,
    c.purchases,
    (c.plays * 1 + c.likes * 5 + c.purchases * 50)::bigint AS score,
    CASE
      WHEN (c.plays * 1 + c.likes * 5 + c.purchases * 50) >= 1000 THEN 'Diamond'
      WHEN (c.plays * 1 + c.likes * 5 + c.purchases * 50) >= 500  THEN 'Gold'
      WHEN (c.plays * 1 + c.likes * 5 + c.purchases * 50) >= 100  THEN 'Silver'
      ELSE 'Bronze'
    END AS tier
  FROM combined c
  WHERE c.user_id IS NOT NULL
  ORDER BY score DESC
  LIMIT _limit;
END;
$$;
