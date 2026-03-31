
-- Add channel_category and channel_tagline to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS channel_category text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS channel_tagline text;

-- Add channel_category to mux_live_streams
ALTER TABLE public.mux_live_streams ADD COLUMN IF NOT EXISTS channel_category text;

-- Create uply_channels table
CREATE TABLE IF NOT EXISTS public.uply_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '📺',
  creator_count integer DEFAULT 0,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uply_channels ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view channels" ON public.uply_channels FOR SELECT USING (true);

-- Seed the 8 default channels
INSERT INTO public.uply_channels (category, display_name, description, icon, position) VALUES
  ('fitness', 'Fitness & Health', 'Workout routines, nutrition, and wellness', '💪', 1),
  ('finance', 'Finance & Investing', 'Trading, crypto, and money management', '💰', 2),
  ('gaming', 'Gaming', 'Esports, game streams, and poker', '🎮', 3),
  ('business', 'Business & Entrepreneurship', 'Marketing, ecommerce, and startups', '🚀', 4),
  ('music', 'Music & Arts', 'DJs, artists, producers, and bands', '🎵', 5),
  ('education', 'Education & Coaching', 'Teaching, courses, and mentorship', '📚', 6),
  ('lifestyle', 'Lifestyle', 'Travel, food, fashion, and culture', '✨', 7),
  ('irl', 'IRL & General', 'Everything else — real life streams', '🌍', 8)
ON CONFLICT (category) DO NOTHING;

-- Auto-assign channel_category based on existing creator_type
UPDATE profiles 
SET channel_category = CASE 
  WHEN creator_type ILIKE '%fitness%' OR creator_type ILIKE '%health%' OR creator_type ILIKE '%workout%' OR creator_type ILIKE '%nutrition%' THEN 'fitness'
  WHEN creator_type ILIKE '%finance%' OR creator_type ILIKE '%invest%' OR creator_type ILIKE '%trading%' OR creator_type ILIKE '%money%' OR creator_type ILIKE '%crypto%' THEN 'finance'
  WHEN creator_type ILIKE '%gaming%' OR creator_type ILIKE '%game%' OR creator_type ILIKE '%esport%' OR creator_type ILIKE '%poker%' THEN 'gaming'
  WHEN creator_type ILIKE '%business%' OR creator_type ILIKE '%entrepreneur%' OR creator_type ILIKE '%market%' OR creator_type ILIKE '%ecommerce%' THEN 'business'
  WHEN creator_type ILIKE '%music%' OR creator_type ILIKE '%dj%' OR creator_type ILIKE '%artist%' OR creator_type ILIKE '%band%' THEN 'music'
  WHEN creator_type ILIKE '%education%' OR creator_type ILIKE '%teach%' OR creator_type ILIKE '%coach%' OR creator_type ILIKE '%course%' THEN 'education'
  WHEN creator_type ILIKE '%lifestyle%' OR creator_type ILIKE '%travel%' OR creator_type ILIKE '%food%' OR creator_type ILIKE '%fashion%' THEN 'lifestyle'
  ELSE 'irl'
END
WHERE channel_category IS NULL AND creator_type IS NOT NULL;

-- Set default channel tagline
UPDATE profiles
SET channel_tagline = INITCAP(COALESCE(creator_type, 'Creator')) || ' on UPLY'
WHERE channel_tagline IS NULL AND creator_type IS NOT NULL;

-- Migrate stream channel categories
UPDATE mux_live_streams mls
SET channel_category = p.channel_category
FROM profiles p
WHERE p.user_id = mls.user_id
AND mls.channel_category IS NULL
AND p.channel_category IS NOT NULL;

-- Update channel creator counts
UPDATE uply_channels uc
SET creator_count = sub.cnt
FROM (
  SELECT channel_category, COUNT(*) as cnt 
  FROM profiles 
  WHERE channel_category IS NOT NULL AND creator_type IS NOT NULL
  GROUP BY channel_category
) sub
WHERE uc.category = sub.channel_category;
