
-- Community Posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  image_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view community posts" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authors can create posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own posts" ON public.community_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id OR auth.uid() = creator_id);
CREATE POLICY "Authors or creators can delete posts" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid() = author_id OR auth.uid() = creator_id);

-- Community Post Likes
CREATE TABLE public.community_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.community_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like" ON public.community_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.community_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Community Comments
CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public.community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON public.community_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Community Categories
CREATE TABLE public.community_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📌',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.community_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can manage categories" ON public.community_categories FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- Classroom Modules
CREATE TABLE public.classroom_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classroom_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view modules" ON public.classroom_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators manage modules" ON public.classroom_modules FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- Classroom Lessons
CREATE TABLE public.classroom_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.classroom_modules(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text,
  mux_asset_id text,
  duration_seconds integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classroom_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lessons" ON public.classroom_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators manage lessons" ON public.classroom_lessons FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- Lesson Completions
CREATE TABLE public.lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.classroom_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own completions" ON public.lesson_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can complete lessons" ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Community Events
CREATE TABLE public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  event_time time,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view events" ON public.community_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators manage events" ON public.community_events FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- Community Members
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(creator_id, user_id)
);
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view members" ON public.community_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join" ON public.community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave" ON public.community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Member Points
CREATE TABLE public.member_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  action_type text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view points" ON public.member_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert points" ON public.member_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Creator Spaces (about/settings)
CREATE TABLE public.creator_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'My Space',
  description text NOT NULL DEFAULT '',
  cover_image_url text,
  avatar_url text,
  is_public boolean NOT NULL DEFAULT true,
  is_free boolean NOT NULL DEFAULT true,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.creator_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view spaces" ON public.creator_spaces FOR SELECT USING (true);
CREATE POLICY "Creators manage own space" ON public.creator_spaces FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
