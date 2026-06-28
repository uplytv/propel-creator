
CREATE TABLE IF NOT EXISTS public.public_booking_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_slug text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_org text,
  event_type text,
  event_city text,
  event_date date,
  budget_usd integer,
  lineup text,
  message text,
  status text NOT NULL DEFAULT 'new',
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.public_booking_inquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.public_booking_inquiries TO authenticated;
GRANT ALL ON public.public_booking_inquiries TO service_role;

ALTER TABLE public.public_booking_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a booking inquiry"
  ON public.public_booking_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(contact_name) BETWEEN 1 AND 120
    AND char_length(contact_email) BETWEEN 3 AND 200
    AND char_length(artist_slug) BETWEEN 1 AND 80
    AND (message IS NULL OR char_length(message) <= 4000)
    AND (lineup IS NULL OR char_length(lineup) <= 1000)
  );

CREATE POLICY "Admins can read booking inquiries"
  ON public.public_booking_inquiries
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update booking inquiries"
  ON public.public_booking_inquiries
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_public_booking_inquiries_artist_created
  ON public.public_booking_inquiries (artist_slug, created_at DESC);
