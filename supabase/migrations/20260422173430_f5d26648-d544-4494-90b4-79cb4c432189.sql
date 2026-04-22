
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid;
  v_actor uuid;
  v_actor_name text;
BEGIN
  v_actor := NEW.initiated_by;
  v_target := CASE WHEN NEW.user_id = v_actor THEN NEW.friend_id ELSE NEW.user_id END;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_actor_name
  FROM public.profiles WHERE user_id = v_actor;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, link)
    VALUES (v_target, 'friend_request', 'New Friend Request',
            v_actor_name || ' wants to connect', v_actor, '/social/friends');
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Notify the original initiator
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, link)
    VALUES (NEW.initiated_by, 'friend_accepted', 'Friend Request Accepted',
            (SELECT COALESCE(display_name, username, 'Someone') FROM public.profiles
             WHERE user_id = CASE WHEN NEW.initiated_by = NEW.user_id THEN NEW.friend_id ELSE NEW.user_id END)
             || ' accepted your friend request',
            CASE WHEN NEW.initiated_by = NEW.user_id THEN NEW.friend_id ELSE NEW.user_id END,
            '/social/friends');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_friend_request failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_friend_request_insert ON public.friend_connections;
CREATE TRIGGER trg_notify_friend_request_insert
  AFTER INSERT ON public.friend_connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_request();

DROP TRIGGER IF EXISTS trg_notify_friend_request_update ON public.friend_connections;
CREATE TRIGGER trg_notify_friend_request_update
  AFTER UPDATE ON public.friend_connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_request();
