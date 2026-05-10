
-- Artist profiles (extends profiles with music-specific metadata)
CREATE TABLE IF NOT EXISTS public.artist_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  header_image_url TEXT,
  artist_bio TEXT,
  monthly_listeners_cache INTEGER NOT NULL DEFAULT 0,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist profiles are viewable by everyone"
  ON public.artist_profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own artist profile"
  ON public.artist_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artist profile"
  ON public.artist_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own artist profile"
  ON public.artist_profiles FOR DELETE USING (auth.uid() = user_id);

-- Tour dates
CREATE TABLE IF NOT EXISTS public.artist_tour_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  venue_name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  ticket_url TEXT,
  is_sold_out BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_dates_artist ON public.artist_tour_dates(artist_id, event_date);

ALTER TABLE public.artist_tour_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tour dates are viewable by everyone"
  ON public.artist_tour_dates FOR SELECT USING (true);

CREATE POLICY "Artists manage own tour dates"
  ON public.artist_tour_dates FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

-- Merch items
CREATE TABLE IF NOT EXISTS public.artist_merch_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  external_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merch_artist ON public.artist_merch_items(artist_id);

ALTER TABLE public.artist_merch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merch items are viewable by everyone"
  ON public.artist_merch_items FOR SELECT USING (true);

CREATE POLICY "Artists manage own merch"
  ON public.artist_merch_items FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

-- Pre-saves
CREATE TABLE IF NOT EXISTS public.track_presaves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  user_id UUID NOT NULL,
  release_date TIMESTAMPTZ,
  notify_on_release BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_presaves_track ON public.track_presaves(track_id);
CREATE INDEX IF NOT EXISTS idx_presaves_user ON public.track_presaves(user_id);

ALTER TABLE public.track_presaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Presaves are viewable by everyone"
  ON public.track_presaves FOR SELECT USING (true);

CREATE POLICY "Users can presave"
  ON public.track_presaves FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own presave"
  ON public.track_presaves FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger for artist_profiles
CREATE TRIGGER trg_artist_profiles_updated_at
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Listener stats RPC
CREATE OR REPLACE FUNCTION public.get_artist_listener_stats(_artist_id UUID, _days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  monthly_listeners INTEGER;
  total_plays INTEGER;
  top_countries JSONB;
  top_cities JSONB;
BEGIN
  SELECT COUNT(DISTINCT mrp.user_id), COUNT(*)
    INTO monthly_listeners, total_plays
  FROM public.music_recently_played mrp
  JOIN public.music_tracks t ON t.id = mrp.track_id
  WHERE t.creator_id = _artist_id
    AND mrp.played_at >= now() - (_days || ' days')::interval;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('country', country, 'listeners', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO top_countries
  FROM (
    SELECT p.country AS country, COUNT(DISTINCT mrp.user_id) AS cnt
    FROM public.music_recently_played mrp
    JOIN public.music_tracks t ON t.id = mrp.track_id
    JOIN public.profiles p ON p.id = mrp.user_id
    WHERE t.creator_id = _artist_id
      AND mrp.played_at >= now() - (_days || ' days')::interval
      AND p.country IS NOT NULL
    GROUP BY p.country
    ORDER BY cnt DESC
    LIMIT 10
  ) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('city', city, 'listeners', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO top_cities
  FROM (
    SELECT p.city AS city, COUNT(DISTINCT mrp.user_id) AS cnt
    FROM public.music_recently_played mrp
    JOIN public.music_tracks t ON t.id = mrp.track_id
    JOIN public.profiles p ON p.id = mrp.user_id
    WHERE t.creator_id = _artist_id
      AND mrp.played_at >= now() - (_days || ' days')::interval
      AND p.city IS NOT NULL
    GROUP BY p.city
    ORDER BY cnt DESC
    LIMIT 10
  ) c;

  result := jsonb_build_object(
    'monthly_listeners', COALESCE(monthly_listeners, 0),
    'total_plays', COALESCE(total_plays, 0),
    'top_countries', top_countries,
    'top_cities', top_cities
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_artist_listener_stats(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_artist_listener_stats(UUID, INTEGER) TO authenticated, anon;
