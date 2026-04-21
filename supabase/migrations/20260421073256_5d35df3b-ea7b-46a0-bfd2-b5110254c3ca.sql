-- PHASE 6: Trending Engine + Realtime Score Updates

ALTER TABLE public.video_discovery_scores
  ADD COLUMN IF NOT EXISTS momentum_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_30min_ago numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_score_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_vds_score_desc ON public.video_discovery_scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_vds_momentum_desc ON public.video_discovery_scores (momentum_score DESC);
CREATE INDEX IF NOT EXISTS idx_vds_category_score ON public.video_discovery_scores (category, score DESC);

CREATE OR REPLACE FUNCTION public.recalculate_discovery_scores_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  age_hours numeric;
  raw_engagement numeric;
  decay numeric;
  new_score numeric;
  prev_score numeric;
  momentum numeric;
  source_views int;
  source_likes int;
  source_comments int;
  source_shares int;
  source_created timestamptz;
  is_currently_live boolean;
BEGIN
  FOR r IN
    SELECT * FROM public.video_discovery_scores
    WHERE last_score_at < now() - interval '60 seconds'
       OR is_live = true
    LIMIT 5000
  LOOP
    source_views := 0; source_likes := 0; source_comments := 0; source_shares := 0;
    source_created := r.created_at;
    is_currently_live := r.is_live;

    IF r.content_type = 'video' THEN
      SELECT view_count, like_count, comment_count, created_at
        INTO source_views, source_likes, source_comments, source_created
      FROM videos WHERE id = r.content_id;
    ELSIF r.content_type = 'clip' THEN
      SELECT view_count, like_count, share_count, created_at
        INTO source_views, source_likes, source_shares, source_created
      FROM clips WHERE id = r.content_id;
    ELSIF r.content_type = 'recording' THEN
      SELECT view_count, like_count, created_at
        INTO source_views, source_likes, source_created
      FROM stream_recordings WHERE id = r.content_id;
    ELSIF r.content_type = 'post' THEN
      SELECT like_count, comment_count, created_at
        INTO source_likes, source_comments, source_created
      FROM community_posts WHERE id = r.content_id;
    ELSIF r.content_type = 'stream' THEN
      SELECT viewer_count, (status = 'active'), created_at
        INTO source_views, is_currently_live, source_created
      FROM mux_live_streams WHERE id = r.content_id;
    END IF;

    age_hours := EXTRACT(EPOCH FROM (now() - source_created)) / 3600.0;
    decay := exp(-0.08 * age_hours);

    raw_engagement :=
        COALESCE(source_views, 0) * 1.0
      + COALESCE(source_likes, 0) * 3.0
      + COALESCE(source_comments, 0) * 5.0
      + COALESCE(source_shares, 0) * 8.0;

    new_score := raw_engagement * decay;

    IF is_currently_live THEN
      new_score := GREATEST(new_score, 30.0) + LEAST(COALESCE(source_views, 0), 1000) * 0.5;
    END IF;

    IF r.is_new_creator_boosted THEN
      new_score := new_score * 1.5;
    END IF;

    prev_score := r.score_30min_ago;
    IF r.last_score_at < now() - interval '30 minutes' THEN
      prev_score := r.score;
    END IF;

    momentum := CASE
      WHEN prev_score > 0 THEN new_score / prev_score
      WHEN new_score > 0 THEN 2.0
      ELSE 0
    END;

    UPDATE public.video_discovery_scores
       SET score = round(new_score::numeric, 2),
           momentum_score = round(momentum::numeric, 3),
           views = COALESCE(source_views, views),
           likes = COALESCE(source_likes, likes),
           is_live = is_currently_live,
           score_30min_ago = CASE
             WHEN last_score_at < now() - interval '30 minutes' THEN r.score
             ELSE r.score_30min_ago
           END,
           last_score_at = now()
     WHERE id = r.id;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recalculate-discovery-scores') THEN
    PERFORM cron.unschedule('recalculate-discovery-scores');
  END IF;
END $$;

SELECT cron.schedule(
  'recalculate-discovery-scores',
  '*/5 * * * *',
  $$ SELECT public.recalculate_discovery_scores_v2(); $$
);