
CREATE TABLE IF NOT EXISTS public.music_track_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  track_id uuid NOT NULL,
  note text,
  priority integer NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fan_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_mtw_fan ON public.music_track_wishlist(fan_id);
CREATE INDEX IF NOT EXISTS idx_mtw_artist ON public.music_track_wishlist(artist_id);
CREATE INDEX IF NOT EXISTS idx_mtw_track ON public.music_track_wishlist(track_id);

ALTER TABLE public.music_track_wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fans manage own wishlist" ON public.music_track_wishlist;
CREATE POLICY "Fans manage own wishlist" ON public.music_track_wishlist
  FOR ALL USING (auth.uid() = fan_id) WITH CHECK (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Artists view their track demand" ON public.music_track_wishlist;
CREATE POLICY "Artists view their track demand" ON public.music_track_wishlist
  FOR SELECT USING (auth.uid() = artist_id);
