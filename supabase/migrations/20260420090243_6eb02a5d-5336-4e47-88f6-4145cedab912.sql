
-- ============================================================================
-- UPLY DISCOVERY ENGINE
-- Unified scoring across videos, clips, stream_recordings.
-- ============================================================================

-- 1. Discovery scores table (one row per content item)
CREATE TABLE IF NOT EXISTS public.video_discovery_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('video','clip','recording')),
  creator_id uuid NOT NULL,
  category text DEFAULT 'Other',
  views integer NOT NULL DEFAULT 0,
  watch_time_avg_pct numeric NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  feed_clicks integer NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  is_new_creator_boosted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_vds_score ON public.video_discovery_scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_vds_category_score ON public.video_discovery_scores (category, score DESC);
CREATE INDEX IF NOT EXISTS idx_vds_creator ON public.video_discovery_scores (creator_id);
CREATE INDEX IF NOT EXISTS idx_vds_recent ON public.video_discovery_scores (created_at DESC);

ALTER TABLE public.video_discovery_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Discovery scores are public readable"
  ON public.video_discovery_scores FOR SELECT USING (true);

CREATE POLICY "Service role manages scores"
  ON public.video_discovery_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Watch time events (10s heartbeats + exit)
CREATE TABLE IF NOT EXISTS public.watch_time_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL,
  viewer_id uuid,
  session_id text,
  watched_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  watch_pct numeric NOT NULL DEFAULT 0,
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wte_content ON public.watch_time_events (content_type, content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wte_viewer ON public.watch_time_events (viewer_id, created_at DESC);

ALTER TABLE public.watch_time_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert watch events"
  ON public.watch_time_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role reads watch events"
  ON public.watch_time_events FOR SELECT TO service_role USING (true);

CREATE POLICY "Viewers see their own events"
  ON public.watch_time_events FOR SELECT TO authenticated USING (viewer_id = auth.uid());

-- 3. Trending searches
CREATE TABLE IF NOT EXISTS public.trending_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  search_count integer NOT NULL DEFAULT 1,
  last_searched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term)
);

CREATE INDEX IF NOT EXISTS idx_trending_recent ON public.trending_searches (last_searched_at DESC, search_count DESC);

ALTER TABLE public.trending_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trending searches are public readable"
  ON public.trending_searches FOR SELECT USING (true);

CREATE POLICY "Anyone can log searches"
  ON public.trending_searches FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can bump search count"
  ON public.trending_searches FOR UPDATE USING (true);

-- 4. Per-viewer category affinity (drives 1.3x personalization)
CREATE TABLE IF NOT EXISTS public.viewer_category_affinity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL,
  category text NOT NULL,
  watch_count integer NOT NULL DEFAULT 0,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (viewer_id, category)
);

CREATE INDEX IF NOT EXISTS idx_vca_viewer ON public.viewer_category_affinity (viewer_id, watch_count DESC);

ALTER TABLE public.viewer_category_affinity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers see their own affinity"
  ON public.viewer_category_affinity FOR SELECT TO authenticated USING (viewer_id = auth.uid());

CREATE POLICY "Viewers manage their own affinity"
  ON public.viewer_category_affinity FOR ALL TO authenticated USING (viewer_id = auth.uid()) WITH CHECK (viewer_id = auth.uid());

-- 5. Helper: count creator's lifetime videos+clips+recordings
CREATE OR REPLACE FUNCTION public.creator_content_count(p_creator_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM videos WHERE creator_id = p_creator_id)::int +
    (SELECT COUNT(*) FROM clips WHERE creator_id = p_creator_id)::int +
    (SELECT COUNT(*) FROM stream_recordings WHERE creator_id = p_creator_id)::int;
$$;

-- 6. Helper: detect new creator (under 100 lifetime items AND first content within 30 days)
CREATE OR REPLACE FUNCTION public.is_new_creator(p_creator_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  first_at timestamptz;
  count_total int;
BEGIN
  count_total := creator_content_count(p_creator_id);
  IF count_total >= 100 THEN RETURN false; END IF;

  SELECT LEAST(
    COALESCE((SELECT MIN(created_at) FROM videos WHERE creator_id = p_creator_id), now()),
    COALESCE((SELECT MIN(created_at) FROM clips WHERE creator_id = p_creator_id), now()),
    COALESCE((SELECT MIN(created_at) FROM stream_recordings WHERE creator_id = p_creator_id), now())
  ) INTO first_at;

  RETURN first_at > now() - interval '30 days';
END;
$$;

-- 7. Auto-insert score row when content is created
CREATE OR REPLACE FUNCTION public.auto_insert_discovery_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type text;
  v_category text;
BEGIN
  IF TG_TABLE_NAME = 'videos' THEN
    v_type := 'video';
    v_category := COALESCE(NEW.category, 'Other');
  ELSIF TG_TABLE_NAME = 'clips' THEN
    v_type := 'clip';
    v_category := 'Shorts';
  ELSE
    v_type := 'recording';
    v_category := 'Live';
  END IF;

  INSERT INTO public.video_discovery_scores
    (content_id, content_type, creator_id, category, is_new_creator_boosted, score)
  VALUES
    (NEW.id, v_type, NEW.creator_id, v_category,
     public.is_new_creator(NEW.creator_id),
     -- seed score so brand-new content surfaces immediately
     CASE WHEN public.is_new_creator(NEW.creator_id) THEN 1.5 ELSE 1.0 END)
  ON CONFLICT (content_type, content_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_videos_discovery_insert ON public.videos;
CREATE TRIGGER trg_videos_discovery_insert AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_discovery_score();

DROP TRIGGER IF EXISTS trg_clips_discovery_insert ON public.clips;
CREATE TRIGGER trg_clips_discovery_insert AFTER INSERT ON public.clips
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_discovery_score();

DROP TRIGGER IF EXISTS trg_recordings_discovery_insert ON public.stream_recordings;
CREATE TRIGGER trg_recordings_discovery_insert AFTER INSERT ON public.stream_recordings
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_discovery_score();

-- 8. Backfill existing content
INSERT INTO public.video_discovery_scores (content_id, content_type, creator_id, category, is_new_creator_boosted, score, created_at)
SELECT id, 'video', creator_id, COALESCE(category, 'Other'), public.is_new_creator(creator_id),
       CASE WHEN public.is_new_creator(creator_id) THEN 1.5 ELSE 1.0 END, created_at
FROM public.videos
ON CONFLICT (content_type, content_id) DO NOTHING;

INSERT INTO public.video_discovery_scores (content_id, content_type, creator_id, category, is_new_creator_boosted, score, created_at)
SELECT id, 'clip', creator_id, 'Shorts', public.is_new_creator(creator_id),
       CASE WHEN public.is_new_creator(creator_id) THEN 1.5 ELSE 1.0 END, created_at
FROM public.clips WHERE is_public = true
ON CONFLICT (content_type, content_id) DO NOTHING;

INSERT INTO public.video_discovery_scores (content_id, content_type, creator_id, category, is_new_creator_boosted, score, created_at)
SELECT id, 'recording', creator_id, 'Live', public.is_new_creator(creator_id),
       CASE WHEN public.is_new_creator(creator_id) THEN 1.5 ELSE 1.0 END, created_at
FROM public.stream_recordings WHERE is_published = true
ON CONFLICT (content_type, content_id) DO NOTHING;

-- 9. Bump trending_searches term (used by edge function but exposed for client too)
CREATE OR REPLACE FUNCTION public.bump_trending_search(p_term text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_term IS NULL OR length(trim(p_term)) < 2 THEN RETURN; END IF;
  INSERT INTO public.trending_searches (term, search_count, last_searched_at)
  VALUES (lower(trim(p_term)), 1, now())
  ON CONFLICT (term) DO UPDATE
    SET search_count = trending_searches.search_count + 1,
        last_searched_at = now();
END;
$$;

-- 10. Bump category affinity (logged-in viewers only)
CREATE OR REPLACE FUNCTION public.bump_viewer_affinity(p_viewer uuid, p_category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_viewer IS NULL OR p_category IS NULL THEN RETURN; END IF;
  INSERT INTO public.viewer_category_affinity (viewer_id, category, watch_count, last_watched_at)
  VALUES (p_viewer, p_category, 1, now())
  ON CONFLICT (viewer_id, category) DO UPDATE
    SET watch_count = viewer_category_affinity.watch_count + 1,
        last_watched_at = now();
END;
$$;

-- 11. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_discovery_scores;
