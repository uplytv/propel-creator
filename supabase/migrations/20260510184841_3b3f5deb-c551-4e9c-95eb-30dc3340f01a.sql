
CREATE TABLE public.music_stem_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  bpm INTEGER,
  music_key TEXT,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mss_artist ON public.music_stem_stations(artist_id);
CREATE INDEX idx_mss_status ON public.music_stem_stations(status);
ALTER TABLE public.music_stem_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stem stations public view published"
ON public.music_stem_stations FOR SELECT
USING (status = 'published' OR auth.uid() = artist_id);

CREATE POLICY "Artist manages own stem stations"
ON public.music_stem_stations FOR ALL
USING (auth.uid() = artist_id)
WITH CHECK (auth.uid() = artist_id);

CREATE TRIGGER trg_mss_updated_at
BEFORE UPDATE ON public.music_stem_stations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_stem_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.music_stem_stations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('drums','bass','vocals','melody','fx','other')),
  label TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mst_station ON public.music_stem_tracks(station_id);
ALTER TABLE public.music_stem_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stem tracks visible if station visible"
ON public.music_stem_tracks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.music_stem_stations s
  WHERE s.id = station_id AND (s.status = 'published' OR s.artist_id = auth.uid())
));

CREATE POLICY "Artist manages own stem tracks"
ON public.music_stem_tracks FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.music_stem_stations s
  WHERE s.id = station_id AND s.artist_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.music_stem_stations s
  WHERE s.id = station_id AND s.artist_id = auth.uid()
));

CREATE TRIGGER trg_mst_updated_at
BEFORE UPDATE ON public.music_stem_tracks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_stem_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.music_stem_stations(id) ON DELETE CASCADE,
  stem_id UUID REFERENCES public.music_stem_tracks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_msd_station ON public.music_stem_downloads(station_id);
CREATE INDEX idx_msd_user ON public.music_stem_downloads(user_id);
ALTER TABLE public.music_stem_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own downloads"
ON public.music_stem_downloads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own downloads"
ON public.music_stem_downloads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_stem_station_downloads()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_stem_stations
    SET download_count = download_count + 1
    WHERE id = NEW.station_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_stem_downloads
AFTER INSERT ON public.music_stem_downloads
FOR EACH ROW EXECUTE FUNCTION public.sync_stem_station_downloads();
