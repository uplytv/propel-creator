
-- ============================================
-- STORIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text DEFAULT 'image',
  caption text,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  location_label text,
  expires_at timestamptz DEFAULT now() + interval '24 hours',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read non-expired stories from followed users or own"
ON public.stories FOR SELECT TO authenticated
USING (
  expires_at > now() AND (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = stories.user_id)
  )
);

CREATE POLICY "Users can insert own stories"
ON public.stories FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stories"
ON public.stories FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own stories"
ON public.stories FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- STORY VIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.story_views (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own views"
ON public.story_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "Users can read views on own stories"
ON public.story_views FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())
  OR viewer_id = auth.uid()
);

-- ============================================
-- ATTENDANCE
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  status text DEFAULT 'going' CHECK (status IN ('going', 'maybe')),
  attend_date date NOT NULL,
  visibility text DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (visibility = 'public')
  OR (visibility = 'friends' AND EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = attendance.user_id))
);

CREATE POLICY "Users can insert own attendance"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attendance"
ON public.attendance FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own attendance"
ON public.attendance FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- HEYS
-- ============================================
CREATE TABLE IF NOT EXISTS public.heys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  hey_type text DEFAULT 'free' CHECK (hey_type IN ('free', 'super')),
  is_mutual boolean DEFAULT false,
  sender_revealed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, recipient_id, event_id)
);

ALTER TABLE public.heys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own heys"
ON public.heys FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send heys"
ON public.heys FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can update heys for mutual"
ON public.heys FOR UPDATE TO authenticated
USING (recipient_id = auth.uid());

-- ============================================
-- SOCIAL POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  content text,
  media_urls text[] DEFAULT '{}',
  post_type text DEFAULT 'general' CHECK (post_type IN ('general', 'fit', 'going', 'venue_special', 'marketplace')),
  reaction_counts jsonb DEFAULT '{"fire":0,"heart":0,"eyes":0,"clap":0}',
  comment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read social posts"
ON public.social_posts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own social posts"
ON public.social_posts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own social posts"
ON public.social_posts FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own social posts"
ON public.social_posts FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- SOCIAL POST REACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.social_post_reactions (
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text CHECK (reaction IN ('fire', 'heart', 'eyes', 'clap')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.social_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions"
ON public.social_post_reactions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own reactions"
ON public.social_post_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reactions"
ON public.social_post_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- SOCIAL POST COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.social_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
ON public.social_post_comments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own comments"
ON public.social_post_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
ON public.social_post_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- PROFILE COLUMNS
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heydar_active_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_producer boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS producer_type text CHECK (producer_type IN ('venue', 'promoter', 'artist'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS traveling boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travel_city text;

-- ============================================
-- EVENT COLUMNS
-- ============================================
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS happy_hour_start time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS happy_hour_end time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_charge numeric;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS dress_code text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS age_restriction text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false;

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload to own stories folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can read stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Users can delete own stories"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.heys;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
