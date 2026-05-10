CREATE TABLE public.music_ppv_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  stream_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mps_artist ON public.music_ppv_shows(artist_id);
CREATE INDEX idx_mps_status ON public.music_ppv_shows(status);
ALTER TABLE public.music_ppv_shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view non-draft ppv shows" ON public.music_ppv_shows
  FOR SELECT USING (status IN ('scheduled','live','ended'));
CREATE POLICY "Artists manage own ppv shows" ON public.music_ppv_shows
  FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

CREATE TRIGGER trg_mps_updated_at BEFORE UPDATE ON public.music_ppv_shows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_ppv_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.music_ppv_shows(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (show_id, fan_id)
);
CREATE INDEX idx_mpt_show ON public.music_ppv_tickets(show_id);
CREATE INDEX idx_mpt_fan ON public.music_ppv_tickets(fan_id);
ALTER TABLE public.music_ppv_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans view own tickets" ON public.music_ppv_tickets
  FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "Artists view tickets for own shows" ON public.music_ppv_tickets
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.music_ppv_shows s WHERE s.id = show_id AND s.artist_id = auth.uid()));
CREATE POLICY "Fans create own tickets" ON public.music_ppv_tickets
  FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans update own tickets" ON public.music_ppv_tickets
  FOR UPDATE USING (auth.uid() = fan_id);

CREATE TRIGGER trg_mpt_updated_at BEFORE UPDATE ON public.music_ppv_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();