
CREATE TABLE public.music_tour_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','closed')),
  suggestion_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_tour_suggestions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mts_artist ON public.music_tour_suggestions(artist_id);
CREATE INDEX idx_mts_status ON public.music_tour_suggestions(status);
CREATE TRIGGER trg_mts_updated_at BEFORE UPDATE ON public.music_tour_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "View open tour suggestions" ON public.music_tour_suggestions
  FOR SELECT USING (status <> 'draft' OR auth.uid() = artist_id);
CREATE POLICY "Artist manage tour suggestions" ON public.music_tour_suggestions
  FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

CREATE TABLE public.music_tour_suggestion_cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.music_tour_suggestions(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  region TEXT,
  country TEXT,
  notes TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  suggested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_tour_suggestion_cities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mtsc_suggestion ON public.music_tour_suggestion_cities(suggestion_id);
CREATE TRIGGER trg_mtsc_updated_at BEFORE UPDATE ON public.music_tour_suggestion_cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "View tour suggestion cities" ON public.music_tour_suggestion_cities
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.music_tour_suggestions s
    WHERE s.id = suggestion_id AND (s.status <> 'draft' OR s.artist_id = auth.uid())
  ));
CREATE POLICY "Fans add cities" ON public.music_tour_suggestion_cities
  FOR INSERT WITH CHECK (auth.uid() = suggested_by AND EXISTS (
    SELECT 1 FROM public.music_tour_suggestions s WHERE s.id = suggestion_id AND s.status = 'open'
  ));
CREATE POLICY "Artist manages cities" ON public.music_tour_suggestion_cities
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.music_tour_suggestions s WHERE s.id = suggestion_id AND s.artist_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.music_tour_suggestions s WHERE s.id = suggestion_id AND s.artist_id = auth.uid()
  ));

CREATE TABLE public.music_tour_suggestion_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.music_tour_suggestions(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.music_tour_suggestion_cities(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city_id, fan_id)
);
ALTER TABLE public.music_tour_suggestion_votes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mtsv_suggestion ON public.music_tour_suggestion_votes(suggestion_id);
CREATE INDEX idx_mtsv_fan ON public.music_tour_suggestion_votes(fan_id);

CREATE POLICY "View tour votes" ON public.music_tour_suggestion_votes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.music_tour_suggestions s
    WHERE s.id = suggestion_id AND s.status <> 'draft'
  ));
CREATE POLICY "Fans cast tour votes" ON public.music_tour_suggestion_votes
  FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans remove own tour votes" ON public.music_tour_suggestion_votes
  FOR DELETE USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_tour_suggestion_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_tour_suggestion_cities SET vote_count = vote_count + 1 WHERE id = NEW.city_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_tour_suggestion_cities SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.city_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_tour_votes
  AFTER INSERT OR DELETE ON public.music_tour_suggestion_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_tour_suggestion_counts();

CREATE OR REPLACE FUNCTION public.sync_tour_suggestion_city_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_tour_suggestions SET suggestion_count = suggestion_count + 1 WHERE id = NEW.suggestion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_tour_suggestions SET suggestion_count = GREATEST(suggestion_count - 1, 0) WHERE id = OLD.suggestion_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_tour_city_count
  AFTER INSERT OR DELETE ON public.music_tour_suggestion_cities
  FOR EACH ROW EXECUTE FUNCTION public.sync_tour_suggestion_city_count();
