
CREATE TABLE IF NOT EXISTS public.music_tour_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  tour_name TEXT,
  venue_name TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  country TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  starts_at TIMESTAMPTZ NOT NULL,
  doors_at TIMESTAMPTZ,
  on_sale_at TIMESTAMPTZ,
  ticket_url TEXT,
  status TEXT NOT NULL DEFAULT 'announced',
  cover_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.music_tour_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_date_id UUID NOT NULL REFERENCES public.music_tour_dates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'interested',
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tour_date_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.music_artist_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  user_id UUID NOT NULL,
  city TEXT,
  country TEXT,
  radius_km INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artist_id, user_id)
);

ALTER TABLE public.music_tour_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_tour_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_artist_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tour dates public read" ON public.music_tour_dates;
CREATE POLICY "Tour dates public read"
  ON public.music_tour_dates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Artists manage own tour dates" ON public.music_tour_dates;
CREATE POLICY "Artists manage own tour dates"
  ON public.music_tour_dates FOR ALL
  USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

DROP POLICY IF EXISTS "RSVPs visible to owner and artist" ON public.music_tour_rsvps;
CREATE POLICY "RSVPs visible to owner and artist"
  ON public.music_tour_rsvps FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.music_tour_dates t WHERE t.id = tour_date_id AND t.artist_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users manage own RSVPs" ON public.music_tour_rsvps;
CREATE POLICY "Users manage own RSVPs"
  ON public.music_tour_rsvps FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own artist alerts" ON public.music_artist_alerts;
CREATE POLICY "Users manage own artist alerts"
  ON public.music_artist_alerts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_music_tour_dates_artist ON public.music_tour_dates(artist_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_music_tour_dates_starts ON public.music_tour_dates(starts_at);
CREATE INDEX IF NOT EXISTS idx_music_tour_dates_geo ON public.music_tour_dates(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_music_tour_rsvps_user ON public.music_tour_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_music_artist_alerts_user ON public.music_artist_alerts(user_id);

DROP TRIGGER IF EXISTS update_tour_dates_updated_at ON public.music_tour_dates;
CREATE TRIGGER update_tour_dates_updated_at
  BEFORE UPDATE ON public.music_tour_dates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.nearby_tour_dates(
  _lat NUMERIC,
  _lng NUMERIC,
  _radius_km NUMERIC DEFAULT 100,
  _limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  artist_id UUID,
  tour_name TEXT,
  venue_name TEXT,
  city TEXT,
  country TEXT,
  starts_at TIMESTAMPTZ,
  ticket_url TEXT,
  cover_url TEXT,
  distance_km NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.artist_id, t.tour_name, t.venue_name, t.city, t.country,
         t.starts_at, t.ticket_url, t.cover_url,
         (6371 * acos(
           LEAST(1, GREATEST(-1,
             cos(radians(_lat)) * cos(radians(t.latitude))
             * cos(radians(t.longitude) - radians(_lng))
             + sin(radians(_lat)) * sin(radians(t.latitude))
           ))
         ))::numeric AS distance_km
  FROM public.music_tour_dates t
  WHERE t.latitude IS NOT NULL
    AND t.longitude IS NOT NULL
    AND t.starts_at >= now()
    AND (6371 * acos(
           LEAST(1, GREATEST(-1,
             cos(radians(_lat)) * cos(radians(t.latitude))
             * cos(radians(t.longitude) - radians(_lng))
             + sin(radians(_lat)) * sin(radians(t.latitude))
           ))
         )) <= _radius_km
  ORDER BY t.starts_at ASC
  LIMIT _limit;
$$;
