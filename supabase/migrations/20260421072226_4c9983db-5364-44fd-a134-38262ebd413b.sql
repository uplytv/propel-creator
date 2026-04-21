-- Notify followers when a creator goes live
CREATE OR REPLACE FUNCTION public.notify_followers_on_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name text;
  r record;
BEGIN
  IF (OLD.status IS DISTINCT FROM 'active') AND NEW.status = 'active' THEN
    SELECT COALESCE(display_name, username, 'A creator') INTO v_creator_name
    FROM public.profiles WHERE user_id = NEW.user_id;

    FOR r IN
      SELECT f.follower_id
      FROM public.follows f
      LEFT JOIN public.notification_preferences np
        ON np.user_id = f.follower_id
      WHERE f.following_id = NEW.user_id
        AND COALESCE(np.creator_live_email, true) = true
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
      VALUES (
        r.follower_id,
        'creator_live',
        '🔴 ' || v_creator_name || ' is live',
        COALESCE(NEW.title, 'Tap to join the stream now'),
        NEW.user_id,
        NEW.id::text,
        '/stream/' || COALESCE(NEW.slug, NEW.id::text)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_live ON public.mux_live_streams;
CREATE TRIGGER trg_notify_followers_on_live
AFTER UPDATE OF status ON public.mux_live_streams
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_live();

-- Sync live viewer count to discovery scores so trending reflects "watching now"
CREATE OR REPLACE FUNCTION public.sync_live_viewer_to_discovery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.video_discovery_scores
      SET views = GREATEST(views, COALESCE(NEW.viewer_count, 0)),
          score = GREATEST(score, 30.0 + LEAST(COALESCE(NEW.viewer_count, 0), 1000) * 0.5),
          is_live = true
    WHERE content_type = 'stream' AND content_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_live_viewer ON public.mux_live_streams;
CREATE TRIGGER trg_sync_live_viewer
AFTER UPDATE OF viewer_count, status ON public.mux_live_streams
FOR EACH ROW EXECUTE FUNCTION public.sync_live_viewer_to_discovery();