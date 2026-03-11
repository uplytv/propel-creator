
-- General notifications table for social/community events
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  link TEXT,
  actor_id UUID,
  reference_id TEXT
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify post author when someone comments
CREATE OR REPLACE FUNCTION public.notify_on_community_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_commenter_name TEXT;
BEGIN
  SELECT author_id, title INTO v_post_author_id, v_post_title
  FROM public.community_posts WHERE id = NEW.post_id;

  -- Don't notify yourself
  IF v_post_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO v_commenter_name
  FROM public.profiles WHERE user_id = NEW.author_id;

  INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
  VALUES (
    v_post_author_id,
    'community_comment',
    'New Comment',
    v_commenter_name || ' commented on your post "' || COALESCE(LEFT(v_post_title, 50), 'your post') || '"',
    NEW.author_id,
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_community_comment
  AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_community_comment();

-- Trigger: notify post author when someone likes their post
CREATE OR REPLACE FUNCTION public.notify_on_community_like()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_liker_name TEXT;
BEGIN
  SELECT author_id, title INTO v_post_author_id, v_post_title
  FROM public.community_posts WHERE id = NEW.post_id;

  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
  VALUES (
    v_post_author_id,
    'community_like',
    'Post Liked',
    v_liker_name || ' liked your post "' || COALESCE(LEFT(v_post_title, 50), 'your post') || '"',
    NEW.user_id,
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_community_like
  AFTER INSERT ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_community_like();

-- Trigger: notify when someone follows you
CREATE OR REPLACE FUNCTION public.notify_on_follow()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
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
$$;

CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Trigger: notify when you receive a tip
CREATE OR REPLACE FUNCTION public.notify_on_tip()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  IF NEW.receiver_id = NEW.sender_id THEN
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
$$;

CREATE TRIGGER trg_notify_tip
  AFTER INSERT ON public.tip_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_tip();

-- Trigger: notify creator when someone joins their community
CREATE OR REPLACE FUNCTION public.notify_on_member_join()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_member_name TEXT;
BEGIN
  IF NEW.creator_id = NEW.user_id THEN
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
$$;

CREATE TRIGGER trg_notify_member_join
  AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_member_join();
