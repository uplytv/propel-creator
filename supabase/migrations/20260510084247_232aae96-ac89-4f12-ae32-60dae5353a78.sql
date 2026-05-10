
CREATE TABLE public.music_gig_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  gig_type TEXT NOT NULL DEFAULT 'live',
  genres TEXT[] NOT NULL DEFAULT '{}',
  instruments TEXT[] NOT NULL DEFAULT '{}',
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  min_duration_minutes INTEGER NOT NULL DEFAULT 60,
  travel_radius_km INTEGER NOT NULL DEFAULT 50,
  home_city TEXT,
  artwork_url TEXT,
  demo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  inquiry_count INTEGER NOT NULL DEFAULT 0,
  booking_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_booking_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.music_gig_listings(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL,
  booker_id UUID NOT NULL,
  event_title TEXT,
  event_date TIMESTAMPTZ,
  event_location TEXT,
  duration_minutes INTEGER,
  budget_cents INTEGER,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.music_booking_inquiries(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_music_gig_listings_artist ON public.music_gig_listings(artist_id);
CREATE INDEX idx_music_gig_listings_active ON public.music_gig_listings(is_active, gig_type);
CREATE INDEX idx_music_booking_inquiries_artist ON public.music_booking_inquiries(artist_id, status);
CREATE INDEX idx_music_booking_inquiries_booker ON public.music_booking_inquiries(booker_id, status);
CREATE INDEX idx_music_booking_messages_inquiry ON public.music_booking_messages(inquiry_id, created_at);

ALTER TABLE public.music_gig_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_booking_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_booking_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active gig listings are public"
  ON public.music_gig_listings FOR SELECT USING (is_active = true OR auth.uid() = artist_id);

CREATE POLICY "Artists manage own gig listings"
  ON public.music_gig_listings FOR ALL
  USING (auth.uid() = artist_id)
  WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Inquiry parties view inquiries"
  ON public.music_booking_inquiries FOR SELECT
  USING (auth.uid() = booker_id OR auth.uid() = artist_id);

CREATE POLICY "Bookers create inquiries"
  ON public.music_booking_inquiries FOR INSERT
  WITH CHECK (auth.uid() = booker_id);

CREATE POLICY "Inquiry parties update inquiries"
  ON public.music_booking_inquiries FOR UPDATE
  USING (auth.uid() = booker_id OR auth.uid() = artist_id);

CREATE POLICY "Inquiry parties view messages"
  ON public.music_booking_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.music_booking_inquiries i
    WHERE i.id = inquiry_id AND (i.booker_id = auth.uid() OR i.artist_id = auth.uid())
  ));

CREATE POLICY "Inquiry parties send messages"
  ON public.music_booking_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.music_booking_inquiries i
      WHERE i.id = inquiry_id AND (i.booker_id = auth.uid() OR i.artist_id = auth.uid())
    )
  );

CREATE TRIGGER update_music_gig_listings_updated_at
  BEFORE UPDATE ON public.music_gig_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_music_booking_inquiries_updated_at
  BEFORE UPDATE ON public.music_booking_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_gig_listing_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_gig_listings SET inquiry_count = inquiry_count + 1 WHERE id = NEW.listing_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'confirmed' THEN
    UPDATE public.music_gig_listings SET booking_count = booking_count + 1 WHERE id = NEW.listing_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_gig_listing_counts
  AFTER INSERT OR UPDATE ON public.music_booking_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.sync_gig_listing_counts();
