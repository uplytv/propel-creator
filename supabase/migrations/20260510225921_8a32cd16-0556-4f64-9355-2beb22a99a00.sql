
CREATE TABLE IF NOT EXISTS public.music_tour_city_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  nominator_id UUID NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  country TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','considering','booked','declined')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mtcr_artist_city
  ON public.music_tour_city_requests (artist_id, lower(city), country);
CREATE INDEX IF NOT EXISTS idx_mtcr_artist ON public.music_tour_city_requests(artist_id, vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_mtcr_status ON public.music_tour_city_requests(status);

ALTER TABLE public.music_tour_city_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tour requests"
ON public.music_tour_city_requests FOR SELECT
USING (true);

CREATE POLICY "Authenticated can nominate"
ON public.music_tour_city_requests FOR INSERT
WITH CHECK (auth.uid() = nominator_id);

CREATE POLICY "Artists can update requests for them"
ON public.music_tour_city_requests FOR UPDATE
USING (auth.uid() = artist_id);

CREATE POLICY "Nominator or artist can delete"
ON public.music_tour_city_requests FOR DELETE
USING (auth.uid() = nominator_id OR auth.uid() = artist_id);

CREATE TRIGGER trg_mtcr_updated_at
BEFORE UPDATE ON public.music_tour_city_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.music_tour_city_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.music_tour_city_requests(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_mtcv_request ON public.music_tour_city_votes(request_id);
CREATE INDEX IF NOT EXISTS idx_mtcv_fan ON public.music_tour_city_votes(fan_id);

ALTER TABLE public.music_tour_city_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view votes"
ON public.music_tour_city_votes FOR SELECT
USING (true);

CREATE POLICY "Fans can vote"
ON public.music_tour_city_votes FOR INSERT
WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Fans can remove their vote"
ON public.music_tour_city_votes FOR DELETE
USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_tour_city_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_tour_city_requests
    SET vote_count = vote_count + 1
    WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_tour_city_requests
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mtcv_count
AFTER INSERT OR DELETE ON public.music_tour_city_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_tour_city_vote_count();
