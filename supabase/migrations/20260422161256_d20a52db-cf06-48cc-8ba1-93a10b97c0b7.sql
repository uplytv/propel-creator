
ALTER TABLE public.video_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.video_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON public.video_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video_created ON public.video_comments(video_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.video_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.video_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_comment_likes_comment ON public.video_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_video_comment_likes_user ON public.video_comment_likes(user_id);

ALTER TABLE public.video_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.video_comment_likes;
CREATE POLICY "Anyone can view comment likes"
  ON public.video_comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON public.video_comment_likes;
CREATE POLICY "Users can like comments"
  ON public.video_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unlike own likes" ON public.video_comment_likes;
CREATE POLICY "Users can unlike own likes"
  ON public.video_comment_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Triggers: maintain like_count
CREATE OR REPLACE FUNCTION public.increment_video_comment_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.video_comments
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.comment_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.decrement_video_comment_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.video_comments
    SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1)
    WHERE id = OLD.comment_id;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS on_video_comment_like_insert ON public.video_comment_likes;
CREATE TRIGGER on_video_comment_like_insert
  AFTER INSERT ON public.video_comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.increment_video_comment_like_count();

DROP TRIGGER IF EXISTS on_video_comment_like_delete ON public.video_comment_likes;
CREATE TRIGGER on_video_comment_like_delete
  AFTER DELETE ON public.video_comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_video_comment_like_count();

-- Triggers: maintain reply_count on parent comment
CREATE OR REPLACE FUNCTION public.increment_video_comment_reply_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE public.video_comments
      SET reply_count = COALESCE(reply_count, 0) + 1
      WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.decrement_video_comment_reply_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.parent_id IS NOT NULL THEN
    UPDATE public.video_comments
      SET reply_count = GREATEST(0, COALESCE(reply_count, 0) - 1)
      WHERE id = OLD.parent_id;
  END IF;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS on_video_comment_reply_insert ON public.video_comments;
CREATE TRIGGER on_video_comment_reply_insert
  AFTER INSERT ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.increment_video_comment_reply_count();

DROP TRIGGER IF EXISTS on_video_comment_reply_delete ON public.video_comments;
CREATE TRIGGER on_video_comment_reply_delete
  AFTER DELETE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.decrement_video_comment_reply_count();

-- Add to realtime publication (if not already)
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comment_likes;
