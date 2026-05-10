
CREATE TABLE IF NOT EXISTS public.music_road_postcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  city TEXT NOT NULL,
  country TEXT,
  postcard_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT,
  message TEXT NOT NULL,
  mood TEXT CHECK (mood IS NULL OR mood IN ('hyped','tired','grateful','homesick','curious','party')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mrp_artist ON public.music_road_postcards(artist_id);
CREATE INDEX IF NOT EXISTS idx_mrp_date ON public.music_road_postcards(postcard_date DESC);

ALTER TABLE public.music_road_postcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views published postcards"
  ON public.music_road_postcards FOR SELECT
  USING (status = 'published' OR auth.uid() = artist_id);
CREATE POLICY "Artists create postcards"
  ON public.music_road_postcards FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own postcards"
  ON public.music_road_postcards FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artists delete own postcards"
  ON public.music_road_postcards FOR DELETE USING (auth.uid() = artist_id);

CREATE TRIGGER trg_mrp_updated_at
  BEFORE UPDATE ON public.music_road_postcards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.music_road_postcard_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  postcard_id UUID NOT NULL REFERENCES public.music_road_postcards(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (postcard_id, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_mrpl_postcard ON public.music_road_postcard_likes(postcard_id);
CREATE INDEX IF NOT EXISTS idx_mrpl_fan ON public.music_road_postcard_likes(fan_id);

ALTER TABLE public.music_road_postcard_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views postcard likes"
  ON public.music_road_postcard_likes FOR SELECT USING (true);
CREATE POLICY "Fans like postcards"
  ON public.music_road_postcard_likes FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans unlike own postcard likes"
  ON public.music_road_postcard_likes FOR DELETE USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_road_postcard_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_road_postcards
      SET like_count = like_count + 1 WHERE id = NEW.postcard_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_road_postcards
      SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.postcard_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mrpl_sync
  AFTER INSERT OR DELETE ON public.music_road_postcard_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_road_postcard_likes();
