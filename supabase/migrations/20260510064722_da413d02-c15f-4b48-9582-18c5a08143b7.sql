
CREATE TABLE public.music_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_path TEXT,
  cover_url TEXT,
  actor_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_music_notifications_user_created
  ON public.music_notifications (user_id, created_at DESC);
CREATE INDEX idx_music_notifications_user_unread
  ON public.music_notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.music_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own music notifications"
  ON public.music_notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "users update own music notifications"
  ON public.music_notifications FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "users delete own music notifications"
  ON public.music_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Fan out a "new release" notification to every follower when a track is published.
CREATE OR REPLACE FUNCTION public.notify_followers_new_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name TEXT;
BEGIN
  IF NEW.is_published = true AND (OLD.is_published IS DISTINCT FROM true) THEN
    SELECT COALESCE(display_name, username, 'A creator')
      INTO creator_name
      FROM public.profiles
      WHERE id = NEW.creator_id;

    INSERT INTO public.music_notifications (user_id, type, title, body, link_path, cover_url, actor_id)
    SELECT
      f.follower_id,
      'new_release',
      creator_name || ' just dropped a new track',
      NEW.title,
      '/music/track/' || NEW.id,
      NEW.cover_art_url,
      NEW.creator_id
    FROM public.follows f
    WHERE f.following_id = NEW.creator_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_new_release ON public.tracks;
CREATE TRIGGER trg_notify_followers_new_release
AFTER INSERT OR UPDATE OF is_published ON public.tracks
FOR EACH ROW
EXECUTE FUNCTION public.notify_followers_new_release();
