CREATE TABLE public.music_stem_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  track_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  bpm INTEGER,
  musical_key TEXT,
  preview_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  license_type TEXT NOT NULL DEFAULT 'non_exclusive',
  status TEXT NOT NULL DEFAULT 'live',
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_stem_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.music_stem_listings(id) ON DELETE CASCADE,
  stem_kind TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_format TEXT,
  file_size_bytes BIGINT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_stem_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.music_stem_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_stem_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_stem_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_stem_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views live stem listings" ON public.music_stem_listings
  FOR SELECT USING (status = 'live' OR auth.uid() = owner_id);
CREATE POLICY "Owners manage stem listings" ON public.music_stem_listings
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Buyers and owners view stem files" ON public.music_stem_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.music_stem_listings l
            WHERE l.id = listing_id AND l.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.music_stem_purchases p
               WHERE p.listing_id = listing_id AND p.buyer_id = auth.uid())
  );
CREATE POLICY "Owners manage stem files" ON public.music_stem_files
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.music_stem_listings l
            WHERE l.id = listing_id AND l.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.music_stem_listings l
            WHERE l.id = listing_id AND l.owner_id = auth.uid())
  );

CREATE POLICY "Buyers view own purchases" ON public.music_stem_purchases
  FOR SELECT USING (
    auth.uid() = buyer_id
    OR EXISTS (SELECT 1 FROM public.music_stem_listings l
               WHERE l.id = listing_id AND l.owner_id = auth.uid())
  );
CREATE POLICY "Authenticated users can purchase" ON public.music_stem_purchases
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE INDEX idx_stem_listings_owner ON public.music_stem_listings(owner_id);
CREATE INDEX idx_stem_listings_status ON public.music_stem_listings(status);
CREATE INDEX idx_stem_files_listing ON public.music_stem_files(listing_id);
CREATE INDEX idx_stem_purchases_buyer ON public.music_stem_purchases(buyer_id);
CREATE INDEX idx_stem_purchases_listing ON public.music_stem_purchases(listing_id);

CREATE TRIGGER update_music_stem_listings_updated_at
BEFORE UPDATE ON public.music_stem_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();