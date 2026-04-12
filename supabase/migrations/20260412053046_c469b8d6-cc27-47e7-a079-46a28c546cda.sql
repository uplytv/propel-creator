
-- Add missing columns to social_posts
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS price numeric DEFAULT NULL;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS marketplace_category text DEFAULT NULL;

-- Create social_post_reactions table if not exists
CREATE TABLE IF NOT EXISTS social_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE social_post_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read reactions" ON social_post_reactions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users manage own reactions" ON social_post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users delete own reactions" ON social_post_reactions FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create social_post_comments table if not exists
CREATE TABLE IF NOT EXISTS social_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_post_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read comments" ON social_post_comments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users create own comments" ON social_post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users delete own comments" ON social_post_comments FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
