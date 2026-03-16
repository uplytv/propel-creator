
-- Update notify_on_follow to check new_follower_email preference
CREATE OR REPLACE FUNCTION public.notify_on_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_follower_name TEXT;
  v_wants_notif BOOLEAN;
BEGIN
  -- Check if user has opted out
  SELECT COALESCE(
    (SELECT new_follower_email FROM public.notification_preferences WHERE user_id = NEW.following_id),
    true
  ) INTO v_wants_notif;

  IF NOT v_wants_notif THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO v_follower_name
  FROM public.profiles WHERE user_id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, message, actor_id)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New Follower',
    v_follower_name || ' started following you',
    NEW.follower_id
  );

  RETURN NEW;
END;
$function$;

-- Update notify_on_tip to check tip_received_email preference
CREATE OR REPLACE FUNCTION public.notify_on_tip()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_name TEXT;
  v_wants_notif BOOLEAN;
BEGIN
  IF NEW.receiver_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  -- Check if user has opted out
  SELECT COALESCE(
    (SELECT tip_received_email FROM public.notification_preferences WHERE user_id = NEW.receiver_id),
    true
  ) INTO v_wants_notif;

  IF NOT v_wants_notif THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO v_sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
  VALUES (
    NEW.receiver_id,
    'tip_received',
    'Tip Received! 🎉',
    v_sender_name || ' sent you ' || NEW.amount || ' credits' || CASE WHEN NEW.message IS NOT NULL AND NEW.message != '' THEN ': "' || LEFT(NEW.message, 80) || '"' ELSE '' END,
    NEW.sender_id,
    NEW.stream_id::text
  );

  RETURN NEW;
END;
$function$;

-- Update notify_on_member_join to check member_joined_email preference
CREATE OR REPLACE FUNCTION public.notify_on_member_join()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_name TEXT;
  v_wants_notif BOOLEAN;
BEGIN
  IF NEW.creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check if user has opted out
  SELECT COALESCE(
    (SELECT member_joined_email FROM public.notification_preferences WHERE user_id = NEW.creator_id),
    true
  ) INTO v_wants_notif;

  IF NOT v_wants_notif THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO v_member_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, actor_id)
  VALUES (
    NEW.creator_id,
    'member_joined',
    'New Member',
    v_member_name || ' joined your community',
    NEW.user_id
  );

  RETURN NEW;
END;
$function$;
