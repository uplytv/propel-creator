
-- 1. Add slug columns to all content tables
ALTER TABLE public.mux_live_streams ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.stream_recordings ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.classroom_lessons ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.classroom_modules ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.creator_spaces ADD COLUMN IF NOT EXISTS slug text;

-- 2. Add trending_score to content tables
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS trending_score numeric DEFAULT 0;
ALTER TABLE public.stream_recordings ADD COLUMN IF NOT EXISTS trending_score numeric DEFAULT 0;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS trending_score numeric DEFAULT 0;
ALTER TABLE public.mux_assets ADD COLUMN IF NOT EXISTS trending_score numeric DEFAULT 0;

-- 3. Add download_url to stream_recordings
ALTER TABLE public.stream_recordings ADD COLUMN IF NOT EXISTS download_url text;

-- 4. Create generate_slug function
CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := lower(input_text);
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '[\s]+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(both '-' from result);
  result := left(result, 80);
  IF result = '' THEN
    result := 'untitled';
  END IF;
  RETURN result;
END;
$$;

-- 5. Create trigger function to auto-generate slugs with collision handling
CREATE OR REPLACE FUNCTION public.auto_generate_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
  source_text text;
BEGIN
  -- Determine source column
  IF TG_TABLE_NAME IN ('creator_spaces') THEN
    source_text := NEW.name;
  ELSIF TG_TABLE_NAME = 'community_posts' THEN
    source_text := NEW.title;
  ELSE
    source_text := COALESCE(NEW.title, 'untitled');
  END IF;

  base_slug := public.generate_slug(source_text);
  final_slug := base_slug;

  -- Check for collision within the same table
  LOOP
    EXECUTE format('SELECT 1 FROM public.%I WHERE slug = $1 AND id != $2 LIMIT 1', TG_TABLE_NAME)
    USING final_slug, NEW.id;
    IF NOT FOUND THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_slug := base_slug || '-' || substr(md5(random()::text), 1, 4);
    IF counter > 10 THEN
      final_slug := base_slug || '-' || substr(NEW.id::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- 6. Create triggers for each table
CREATE OR REPLACE TRIGGER trg_slug_mux_live_streams
  BEFORE INSERT ON public.mux_live_streams
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();

CREATE OR REPLACE TRIGGER trg_slug_stream_recordings
  BEFORE INSERT ON public.stream_recordings
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();

CREATE OR REPLACE TRIGGER trg_slug_clips
  BEFORE INSERT ON public.clips
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();

CREATE OR REPLACE TRIGGER trg_slug_community_posts
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();

CREATE OR REPLACE TRIGGER trg_slug_classroom_lessons
  BEFORE INSERT ON public.classroom_lessons
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();

CREATE OR REPLACE TRIGGER trg_slug_classroom_modules
  BEFORE INSERT ON public.classroom_modules
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();

CREATE OR REPLACE TRIGGER trg_slug_creator_spaces
  BEFORE INSERT ON public.creator_spaces
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();

-- 7. Create indexes for slug lookups
CREATE INDEX IF NOT EXISTS idx_mux_live_streams_slug ON public.mux_live_streams(slug);
CREATE INDEX IF NOT EXISTS idx_stream_recordings_slug ON public.stream_recordings(slug);
CREATE INDEX IF NOT EXISTS idx_clips_slug ON public.clips(slug);
CREATE INDEX IF NOT EXISTS idx_community_posts_slug ON public.community_posts(slug);
CREATE INDEX IF NOT EXISTS idx_classroom_lessons_slug ON public.classroom_lessons(slug);
CREATE INDEX IF NOT EXISTS idx_classroom_modules_slug ON public.classroom_modules(slug);
CREATE INDEX IF NOT EXISTS idx_creator_spaces_slug ON public.creator_spaces(slug);

-- 8. Create indexes for trending_score
CREATE INDEX IF NOT EXISTS idx_clips_trending ON public.clips(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_stream_recordings_trending ON public.stream_recordings(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_trending ON public.community_posts(trending_score DESC);

-- 9. Backfill existing slugs
UPDATE public.mux_live_streams SET slug = public.generate_slug(COALESCE(title, 'stream-' || substr(id::text, 1, 8))) WHERE slug IS NULL;
UPDATE public.stream_recordings SET slug = public.generate_slug(COALESCE(title, 'recording-' || substr(id::text, 1, 8))) WHERE slug IS NULL;
UPDATE public.clips SET slug = public.generate_slug(COALESCE(caption, 'clip-' || substr(id::text, 1, 8))) WHERE slug IS NULL;
UPDATE public.community_posts SET slug = public.generate_slug(COALESCE(title, 'post-' || substr(id::text, 1, 8))) WHERE slug IS NULL;
UPDATE public.classroom_lessons SET slug = public.generate_slug(COALESCE(title, 'lesson-' || substr(id::text, 1, 8))) WHERE slug IS NULL;
UPDATE public.classroom_modules SET slug = public.generate_slug(COALESCE(title, 'module-' || substr(id::text, 1, 8))) WHERE slug IS NULL;
UPDATE public.creator_spaces SET slug = public.generate_slug(COALESCE(name, 'space-' || substr(id::text, 1, 8))) WHERE slug IS NULL;
