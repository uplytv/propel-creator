
CREATE TABLE public.music_fan_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  mood TEXT,
  genres TEXT[] DEFAULT '{}',
  artwork_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_fan_station_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.music_fan_stations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  audio_url TEXT NOT NULL,
  artwork_url TEXT,
  duration_seconds NUMERIC,
  track_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_fan_radio_listens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  station_id UUID REFERENCES public.music_fan_stations(id) ON DELETE SET NULL,
  track_id UUID REFERENCES public.music_fan_station_tracks(id) ON DELETE SET NULL,
  liked BOOLEAN,
  skipped BOOLEAN NOT NULL DEFAULT false,
  listened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_fan_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_fan_station_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_fan_radio_listens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fan stations public read"
  ON public.music_fan_stations FOR SELECT
  USING (is_published = true OR auth.uid() = creator_id);

CREATE POLICY "Fan station curators manage"
  ON public.music_fan_stations FOR ALL
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Fan station tracks public read"
  ON public.music_fan_station_tracks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.music_fan_stations s WHERE s.id = station_id AND (s.is_published = true OR s.creator_id = auth.uid())));

CREATE POLICY "Fan station curators manage tracks"
  ON public.music_fan_station_tracks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.music_fan_stations s WHERE s.id = station_id AND s.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.music_fan_stations s WHERE s.id = station_id AND s.creator_id = auth.uid()));

CREATE POLICY "Users view own fan listens"
  ON public.music_fan_radio_listens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users log own fan listens"
  ON public.music_fan_radio_listens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_fan_stations_published ON public.music_fan_stations(is_published, is_featured DESC, created_at DESC);
CREATE INDEX idx_fan_station_tracks_station ON public.music_fan_station_tracks(station_id, track_position);
CREATE INDEX idx_fan_radio_listens_user ON public.music_fan_radio_listens(user_id, listened_at DESC);

CREATE TRIGGER update_fan_stations_updated_at
  BEFORE UPDATE ON public.music_fan_stations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_personalized_fan_radio(_station_id UUID, _limit INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID,
  station_id UUID,
  title TEXT,
  artist TEXT,
  audio_url TEXT,
  artwork_url TEXT,
  duration_seconds NUMERIC,
  track_position INTEGER,
  affinity NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_signals AS (
    SELECT l.track_id AS tid,
           COUNT(*) FILTER (WHERE l.liked IS TRUE) AS likes,
           COUNT(*) FILTER (WHERE l.skipped) AS skips
    FROM public.music_fan_radio_listens l
    WHERE l.user_id = auth.uid()
    GROUP BY l.track_id
  )
  SELECT t.id, t.station_id, t.title, t.artist, t.audio_url, t.artwork_url,
         t.duration_seconds, t.track_position,
         (COALESCE(us.likes, 0)::numeric * 1.5
          - COALESCE(us.skips, 0)::numeric * 1.0
          + random() * 0.8) AS affinity
  FROM public.music_fan_station_tracks t
  LEFT JOIN user_signals us ON us.tid = t.id
  WHERE t.station_id = _station_id
  ORDER BY affinity DESC
  LIMIT _limit;
$$;
