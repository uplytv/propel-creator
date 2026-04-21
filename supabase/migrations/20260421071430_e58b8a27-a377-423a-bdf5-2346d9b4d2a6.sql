
-- 1. Allow new content types
ALTER TABLE public.video_discovery_scores
  DROP CONSTRAINT IF EXISTS video_discovery_scores_content_type_check;

ALTER TABLE public.video_discovery_scores
  ADD CONSTRAINT video_discovery_scores_content_type_check
  CHECK (content_type = ANY (ARRAY['video','clip','recording','post','product','podcast','event','stream']));

-- 2. Add V2 scoring fields
ALTER TABLE public.video_discovery_scores
  ADD COLUMN IF NOT EXISTS momentum_score numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS quality_score numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS completion_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_burst_at timestamptz,
  ADD COLUMN IF NOT EXISTS prev_shares_snapshot integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prev_score_snapshot numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified_creator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- 3. Composite indexes for the For You / Trending hot path
CREATE INDEX IF NOT EXISTS idx_vds_live_score
  ON public.video_discovery_scores (is_live DESC, score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vds_type_score
  ON public.video_discovery_scores (content_type, score DESC);

-- 4. Upgrade auto_insert function to handle ALL content types
CREATE OR REPLACE FUNCTION public.auto_insert_discovery_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type text;
  v_category text;
  v_creator uuid;
  v_title text;
  v_thumb text;
  v_is_live boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'videos' THEN
    v_type := 'video'; v_category := COALESCE(NEW.category, 'Other');
    v_creator := NEW.creator_id; v_title := NEW.title; v_thumb := NEW.thumbnail_url;
  ELSIF TG_TABLE_NAME = 'clips' THEN
    v_type := 'clip'; v_category := 'Shorts';
    v_creator := NEW.creator_id; v_title := NEW.caption;
  ELSIF TG_TABLE_NAME = 'stream_recordings' THEN
    v_type := 'recording'; v_category := 'Live';
    v_creator := NEW.creator_id; v_title := NEW.title;
  ELSIF TG_TABLE_NAME = 'community_posts' THEN
    v_type := 'post'; v_category := COALESCE(NEW.category, 'Community');
    v_creator := NEW.creator_id; v_title := NEW.title; v_thumb := NEW.image_url;
  ELSIF TG_TABLE_NAME = 'products' THEN
    v_type := 'product'; v_category := 'Commerce';
    v_creator := NEW.user_id; v_title := NEW.name; v_thumb := NEW.image_url;
  ELSIF TG_TABLE_NAME = 'podcast_episodes' THEN
    v_type := 'podcast'; v_category := 'Podcast';
    SELECT cp.creator_id INTO v_creator
      FROM creator_podcasts cp WHERE cp.id = NEW.podcast_id;
    v_title := NEW.title;
  ELSIF TG_TABLE_NAME = 'events' THEN
    v_type := 'event'; v_category := 'Event';
    v_creator := NEW.creator_id; v_title := NEW.title; v_thumb := NEW.cover_image_url;
  ELSIF TG_TABLE_NAME = 'mux_live_streams' THEN
    v_type := 'stream'; v_category := COALESCE(NEW.category, 'Live');
    v_creator := NEW.user_id; v_title := NEW.title;
    v_is_live := (NEW.status = 'active');
  ELSE
    RETURN NEW;
  END IF;

  IF v_creator IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.video_discovery_scores
    (content_id, content_type, creator_id, category, title, thumbnail_url,
     is_new_creator_boosted, is_live, score)
  VALUES
    (NEW.id, v_type, v_creator, v_category, v_title, v_thumb,
     public.is_new_creator(v_creator), v_is_live,
     CASE WHEN v_is_live THEN 30.0
          WHEN public.is_new_creator(v_creator) THEN 5.0
          ELSE 2.0 END)
  ON CONFLICT (content_type, content_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 5. Attach triggers to previously-uncovered tables
DROP TRIGGER IF EXISTS trg_posts_discovery_insert ON public.community_posts;
CREATE TRIGGER trg_posts_discovery_insert AFTER INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_discovery_score();

DROP TRIGGER IF EXISTS trg_products_discovery_insert ON public.products;
CREATE TRIGGER trg_products_discovery_insert AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_discovery_score();

DROP TRIGGER IF EXISTS trg_podcast_eps_discovery_insert ON public.podcast_episodes;
CREATE TRIGGER trg_podcast_eps_discovery_insert AFTER INSERT ON public.podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_discovery_score();

DROP TRIGGER IF EXISTS trg_events_discovery_insert ON public.events;
CREATE TRIGGER trg_events_discovery_insert AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_discovery_score();

DROP TRIGGER IF EXISTS trg_mux_streams_discovery_insert ON public.mux_live_streams;
CREATE TRIGGER trg_mux_streams_discovery_insert AFTER INSERT ON public.mux_live_streams
  FOR EACH ROW EXECUTE FUNCTION public.auto_insert_discovery_score();

-- 6. Live stream status sync
CREATE OR REPLACE FUNCTION public.sync_stream_live_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.video_discovery_scores
    SET is_live = (NEW.status = 'active'),
        score = CASE WHEN NEW.status = 'active' THEN GREATEST(score, 30.0) ELSE score END
  WHERE content_type = 'stream' AND content_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mux_streams_live_sync ON public.mux_live_streams;
CREATE TRIGGER trg_mux_streams_live_sync AFTER UPDATE OF status ON public.mux_live_streams
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_stream_live_status();

-- 7. Session dedup
CREATE TABLE IF NOT EXISTS public.viewer_session_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL,
  session_id text NOT NULL,
  content_id uuid NOT NULL,
  content_type text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vss_lookup
  ON public.viewer_session_seen (viewer_id, session_id, seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_vss_cleanup ON public.viewer_session_seen (seen_at);

ALTER TABLE public.viewer_session_seen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Viewers manage their own session history" ON public.viewer_session_seen;
CREATE POLICY "Viewers manage their own session history"
  ON public.viewer_session_seen FOR ALL TO authenticated
  USING (auth.uid() = viewer_id) WITH CHECK (auth.uid() = viewer_id);

-- 8. Backfill new content types
INSERT INTO public.video_discovery_scores
  (content_id, content_type, creator_id, category, title, thumbnail_url, is_new_creator_boosted, score, created_at)
SELECT id, 'post', creator_id, COALESCE(category,'Community'), title, image_url,
       public.is_new_creator(creator_id),
       CASE WHEN public.is_new_creator(creator_id) THEN 5.0 ELSE 2.0 END, created_at
FROM public.community_posts
ON CONFLICT (content_type, content_id) DO NOTHING;

INSERT INTO public.video_discovery_scores
  (content_id, content_type, creator_id, category, title, thumbnail_url, is_new_creator_boosted, score, created_at)
SELECT id, 'product', user_id, 'Commerce', name, image_url,
       public.is_new_creator(user_id),
       CASE WHEN public.is_new_creator(user_id) THEN 5.0 ELSE 2.0 END, created_at
FROM public.products
ON CONFLICT (content_type, content_id) DO NOTHING;

INSERT INTO public.video_discovery_scores
  (content_id, content_type, creator_id, category, title, is_new_creator_boosted, is_live, score, created_at)
SELECT ls.id, 'stream', ls.user_id, COALESCE(ls.category,'Live'), ls.title,
       public.is_new_creator(ls.user_id),
       (ls.status = 'active'),
       CASE WHEN ls.status = 'active' THEN 30.0
            WHEN public.is_new_creator(ls.user_id) THEN 5.0 ELSE 2.0 END,
       ls.created_at
FROM public.mux_live_streams ls
ON CONFLICT (content_type, content_id) DO NOTHING;

INSERT INTO public.video_discovery_scores
  (content_id, content_type, creator_id, category, title, thumbnail_url, is_new_creator_boosted, score, created_at)
SELECT id, 'event', creator_id, 'Event', title, cover_image_url,
       public.is_new_creator(creator_id),
       CASE WHEN public.is_new_creator(creator_id) THEN 5.0 ELSE 2.0 END, created_at
FROM public.events
ON CONFLICT (content_type, content_id) DO NOTHING;
