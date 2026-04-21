
-- Track which milestones have been notified per content piece
ALTER TABLE public.video_discovery_scores
  ADD COLUMN IF NOT EXISTS trending_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS viral_notified_at timestamptz;

-- Trigger function: notify creators on trending / viral milestones
CREATE OR REPLACE FUNCTION public.notify_creator_on_discovery_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
  v_title text;
BEGIN
  IF NEW.creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_title := COALESCE(NEW.title, 'Your content');

  -- Determine link based on content_type
  v_link := CASE NEW.content_type
    WHEN 'video'     THEN '/video/'    || NEW.content_id::text
    WHEN 'clip'      THEN '/clip/'     || NEW.content_id::text
    WHEN 'recording' THEN '/recording/'|| NEW.content_id::text
    WHEN 'stream'    THEN '/stream/'   || NEW.content_id::text
    WHEN 'post'      THEN '/post/'     || NEW.content_id::text
    WHEN 'product'   THEN '/product/'  || NEW.content_id::text
    WHEN 'podcast'   THEN '/podcast/'  || NEW.content_id::text
    WHEN 'event'     THEN '/event/'    || NEW.content_id::text
    ELSE '/dashboard'
  END;

  -- Trending milestone: score crosses 50 for the first time
  IF NEW.score >= 50
     AND COALESCE(OLD.score, 0) < 50
     AND NEW.trending_notified_at IS NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (
      NEW.creator_id,
      'content_trending',
      '📈 Your content is trending',
      '"' || LEFT(v_title, 60) || '" just hit the trending feed.',
      NEW.content_id::text,
      v_link
    );
    NEW.trending_notified_at := now();
  END IF;

  -- Viral milestone: momentum_score ≥ 2.0 (shares doubled in last window)
  IF COALESCE(NEW.momentum_score, 0) >= 2.0
     AND COALESCE(OLD.momentum_score, 0) < 2.0
     AND NEW.viral_notified_at IS NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (
      NEW.creator_id,
      'content_viral',
      '🔥 Your content is going viral',
      '"' || LEFT(v_title, 60) || '" is gaining serious momentum right now.',
      NEW.content_id::text,
      v_link
    );
    NEW.viral_notified_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_discovery_milestone ON public.video_discovery_scores;
CREATE TRIGGER trg_notify_discovery_milestone
BEFORE UPDATE ON public.video_discovery_scores
FOR EACH ROW
EXECUTE FUNCTION public.notify_creator_on_discovery_milestone();
