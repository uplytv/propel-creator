CREATE TABLE public.music_song_dedications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  dedicated_to TEXT NOT NULL,
  message TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msd_track ON public.music_song_dedications(track_id);
CREATE INDEX idx_msd_artist ON public.music_song_dedications(artist_id);
CREATE INDEX idx_msd_fan ON public.music_song_dedications(fan_id);

ALTER TABLE public.music_song_dedications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view paid public dedications"
ON public.music_song_dedications FOR SELECT
USING (status = 'paid' AND is_public = true);

CREATE POLICY "Fans view own dedications"
ON public.music_song_dedications FOR SELECT
USING (auth.uid() = fan_id);

CREATE POLICY "Artists view dedications on own tracks"
ON public.music_song_dedications FOR SELECT
USING (auth.uid() = artist_id);

CREATE POLICY "Fans create own dedications"
ON public.music_song_dedications FOR INSERT
WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Fans update own dedications"
ON public.music_song_dedications FOR UPDATE
USING (auth.uid() = fan_id);

CREATE TRIGGER trg_msd_updated_at
BEFORE UPDATE ON public.music_song_dedications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();