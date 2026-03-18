
-- Videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  mux_asset_id TEXT,
  playback_id TEXT,
  download_url TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'Other',
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  trending_score NUMERIC DEFAULT 0,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Video likes table
CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (video_id, user_id)
);

-- Video comments table
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Videos RLS: public read for is_public, owner CRUD
CREATE POLICY "Public videos are readable" ON public.videos
  FOR SELECT USING (is_public = true);

CREATE POLICY "Creator can manage own videos" ON public.videos
  FOR ALL TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Video likes RLS
CREATE POLICY "Anyone can read video likes" ON public.video_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.video_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike own likes" ON public.video_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Video comments RLS
CREATE POLICY "Anyone can read video comments" ON public.video_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.video_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.video_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Auto slug trigger for videos
CREATE TRIGGER videos_auto_slug
  BEFORE INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_slug();

-- Increment comment_count trigger
CREATE OR REPLACE FUNCTION public.increment_video_comment_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_video_comment_insert
  AFTER INSERT ON public.video_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_video_comment_count();

-- Decrement comment_count on delete
CREATE OR REPLACE FUNCTION public.decrement_video_comment_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.videos SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.video_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_video_comment_delete
  AFTER DELETE ON public.video_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_video_comment_count();

-- Like count triggers
CREATE OR REPLACE FUNCTION public.increment_video_like_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.videos SET like_count = like_count + 1 WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_video_like_insert
  AFTER INSERT ON public.video_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_video_like_count();

CREATE OR REPLACE FUNCTION public.decrement_video_like_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.videos SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.video_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_video_like_delete
  AFTER DELETE ON public.video_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_video_like_count();

-- Enable realtime for videos
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;
