
CREATE TABLE IF NOT EXISTS public.music_studio_diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  phase TEXT NOT NULL CHECK (phase IN ('writing','recording','producing','mixing','mastering','release_prep')),
  title TEXT NOT NULL,
  notes TEXT,
  hours_logged NUMERIC(5,2) CHECK (hours_logged IS NULL OR (hours_logged >= 0 AND hours_logged <= 24)),
  mood TEXT CHECK (mood IS NULL OR mood IN ('flow','grind','breakthrough','stuck','exhausted','hyped')),
  clip_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  reaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msde_artist ON public.music_studio_diary_entries(artist_id);
CREATE INDEX IF NOT EXISTS idx_msde_date ON public.music_studio_diary_entries(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_msde_phase ON public.music_studio_diary_entries(phase);

ALTER TABLE public.music_studio_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views published diary entries"
  ON public.music_studio_diary_entries FOR SELECT
  USING (status = 'published' OR auth.uid() = artist_id);
CREATE POLICY "Artists insert own diary entries"
  ON public.music_studio_diary_entries FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own diary entries"
  ON public.music_studio_diary_entries FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artists delete own diary entries"
  ON public.music_studio_diary_entries FOR DELETE USING (auth.uid() = artist_id);

CREATE TRIGGER trg_msde_updated_at
  BEFORE UPDATE ON public.music_studio_diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.music_studio_diary_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.music_studio_diary_entries(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('fire','heart','clap','mindblown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_msdr_entry ON public.music_studio_diary_reactions(entry_id);
CREATE INDEX IF NOT EXISTS idx_msdr_fan ON public.music_studio_diary_reactions(fan_id);

ALTER TABLE public.music_studio_diary_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views diary reactions"
  ON public.music_studio_diary_reactions FOR SELECT USING (true);
CREATE POLICY "Fans add own diary reactions"
  ON public.music_studio_diary_reactions FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans update own diary reactions"
  ON public.music_studio_diary_reactions FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "Fans remove own diary reactions"
  ON public.music_studio_diary_reactions FOR DELETE USING (auth.uid() = fan_id);

CREATE TRIGGER trg_msdr_updated_at
  BEFORE UPDATE ON public.music_studio_diary_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_studio_diary_reactions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _entry UUID;
  _count INTEGER;
BEGIN
  _entry := COALESCE(NEW.entry_id, OLD.entry_id);
  SELECT COUNT(*) INTO _count FROM public.music_studio_diary_reactions WHERE entry_id = _entry;
  UPDATE public.music_studio_diary_entries SET reaction_count = _count WHERE id = _entry;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_msdr_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.music_studio_diary_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_studio_diary_reactions();
