
-- Virtual concerts
CREATE TABLE public.music_concerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  ticket_price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  stream_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  max_capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_concerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Concerts are viewable by everyone" ON public.music_concerts FOR SELECT USING (true);
CREATE POLICY "Artists can insert own concerts" ON public.music_concerts FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists can update own concerts" ON public.music_concerts FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artists can delete own concerts" ON public.music_concerts FOR DELETE USING (auth.uid() = artist_id);
CREATE INDEX idx_music_concerts_artist ON public.music_concerts(artist_id);
CREATE INDEX idx_music_concerts_starts ON public.music_concerts(starts_at);

-- Concert tickets
CREATE TABLE public.music_concert_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concert_id UUID NOT NULL REFERENCES public.music_concerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  qr_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (concert_id, user_id)
);
ALTER TABLE public.music_concert_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tickets" ON public.music_concert_tickets FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT artist_id FROM public.music_concerts WHERE id = concert_id));
CREATE POLICY "Users create own tickets" ON public.music_concert_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_concert_tickets_concert ON public.music_concert_tickets(concert_id);

-- Encore bids
CREATE TABLE public.music_encore_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concert_id UUID NOT NULL REFERENCES public.music_concerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  track_id UUID,
  song_title TEXT NOT NULL,
  bid_cents INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_encore_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Encore bids viewable by concert participants" ON public.music_encore_bids FOR SELECT USING (true);
CREATE POLICY "Users create own bids" ON public.music_encore_bids FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Artists update bids on their concerts" ON public.music_encore_bids FOR UPDATE USING (auth.uid() IN (SELECT artist_id FROM public.music_concerts WHERE id = concert_id));
CREATE INDEX idx_encore_bids_concert ON public.music_encore_bids(concert_id, bid_cents DESC);

-- Concert merch carousel
CREATE TABLE public.music_concert_merch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concert_id UUID NOT NULL REFERENCES public.music_concerts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  external_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_concert_merch ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Concert merch viewable by everyone" ON public.music_concert_merch FOR SELECT USING (true);
CREATE POLICY "Artists manage own concert merch" ON public.music_concert_merch FOR ALL USING (auth.uid() IN (SELECT artist_id FROM public.music_concerts WHERE id = concert_id)) WITH CHECK (auth.uid() IN (SELECT artist_id FROM public.music_concerts WHERE id = concert_id));
CREATE INDEX idx_concert_merch_concert ON public.music_concert_merch(concert_id, position);

CREATE TRIGGER update_music_concerts_updated_at BEFORE UPDATE ON public.music_concerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
