
CREATE TABLE IF NOT EXISTS public.music_concert_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  fan_id uuid NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo','video')),
  media_url text NOT NULL,
  caption text,
  venue text,
  city text,
  concert_date date,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcm_artist ON public.music_concert_memories(artist_id);
CREATE INDEX IF NOT EXISTS idx_mcm_fan ON public.music_concert_memories(fan_id);
CREATE INDEX IF NOT EXISTS idx_mcm_date ON public.music_concert_memories(concert_date);

ALTER TABLE public.music_concert_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view visible memories" ON public.music_concert_memories;
CREATE POLICY "Public view visible memories" ON public.music_concert_memories
  FOR SELECT USING (status = 'visible');

DROP POLICY IF EXISTS "Fans view own memories" ON public.music_concert_memories;
CREATE POLICY "Fans view own memories" ON public.music_concert_memories
  FOR SELECT USING (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Fans insert own memories" ON public.music_concert_memories;
CREATE POLICY "Fans insert own memories" ON public.music_concert_memories
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Fans update own memories" ON public.music_concert_memories;
CREATE POLICY "Fans update own memories" ON public.music_concert_memories
  FOR UPDATE USING (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Fans delete own memories" ON public.music_concert_memories;
CREATE POLICY "Fans delete own memories" ON public.music_concert_memories
  FOR DELETE USING (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Artists moderate memories" ON public.music_concert_memories;
CREATE POLICY "Artists moderate memories" ON public.music_concert_memories
  FOR UPDATE USING (auth.uid() = artist_id);

CREATE TABLE IF NOT EXISTS public.music_concert_memory_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES public.music_concert_memories(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(memory_id, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_mcml_memory ON public.music_concert_memory_likes(memory_id);
CREATE INDEX IF NOT EXISTS idx_mcml_fan ON public.music_concert_memory_likes(fan_id);

ALTER TABLE public.music_concert_memory_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view memory likes" ON public.music_concert_memory_likes;
CREATE POLICY "Public view memory likes" ON public.music_concert_memory_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Fans manage own memory likes" ON public.music_concert_memory_likes;
CREATE POLICY "Fans manage own memory likes" ON public.music_concert_memory_likes
  FOR ALL USING (auth.uid() = fan_id) WITH CHECK (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_concert_memory_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_concert_memories SET like_count = like_count + 1 WHERE id = NEW.memory_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_concert_memories SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.memory_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mcml_sync ON public.music_concert_memory_likes;
CREATE TRIGGER trg_mcml_sync
AFTER INSERT OR DELETE ON public.music_concert_memory_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_concert_memory_likes();
