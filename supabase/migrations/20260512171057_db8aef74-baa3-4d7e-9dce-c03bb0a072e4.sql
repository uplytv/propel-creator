
CREATE TABLE IF NOT EXISTS public.radiate_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  content_type TEXT NOT NULL DEFAULT 'announcement',
  content_id UUID,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_km NUMERIC NOT NULL DEFAULT 5 CHECK (radius_km > 0 AND radius_km <= 500),
  city TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  view_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radiate_broadcasts_expires ON public.radiate_broadcasts (expires_at);
CREATE INDEX IF NOT EXISTS idx_radiate_broadcasts_user ON public.radiate_broadcasts (user_id);
CREATE INDEX IF NOT EXISTS idx_radiate_broadcasts_geo ON public.radiate_broadcasts (lat, lng);

ALTER TABLE public.radiate_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active radiates are publicly viewable"
  ON public.radiate_broadcasts FOR SELECT
  USING (expires_at > now() OR auth.uid() = user_id);

CREATE POLICY "Users create own radiates"
  ON public.radiate_broadcasts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own radiates"
  ON public.radiate_broadcasts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own radiates"
  ON public.radiate_broadcasts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.radiate_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.radiate_broadcasts(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL DEFAULT 'view' CHECK (action IN ('view','click','dismiss')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radiate_impr_broadcast ON public.radiate_impressions (broadcast_id);
CREATE INDEX IF NOT EXISTS idx_radiate_impr_user ON public.radiate_impressions (user_id);

ALTER TABLE public.radiate_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record an impression"
  ON public.radiate_impressions FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Broadcast owner sees impressions"
  ON public.radiate_impressions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.radiate_broadcasts b WHERE b.id = broadcast_id AND b.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.radiate_distance_km(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE
AS $$
  SELECT 6371 * 2 * asin(sqrt(
    sin(radians((lat2 - lat1) / 2))^2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians((lng2 - lng1) / 2))^2
  ));
$$;

CREATE OR REPLACE FUNCTION public.nearby_radiates(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  message TEXT,
  link_url TEXT,
  content_type TEXT,
  content_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km NUMERIC,
  city TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.user_id, b.title, b.message, b.link_url, b.content_type,
         b.content_id, b.lat, b.lng, b.radius_km, b.city, b.expires_at, b.created_at,
         public.radiate_distance_km(user_lat, user_lng, b.lat, b.lng) AS distance_km
  FROM public.radiate_broadcasts b
  WHERE b.expires_at > now()
    AND public.radiate_distance_km(user_lat, user_lng, b.lat, b.lng) <= LEAST(max_km, b.radius_km::double precision)
  ORDER BY distance_km ASC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.increment_radiate_counter(
  _broadcast_id UUID,
  _kind TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _kind = 'click' THEN
    UPDATE public.radiate_broadcasts SET click_count = click_count + 1 WHERE id = _broadcast_id;
  ELSE
    UPDATE public.radiate_broadcasts SET view_count = view_count + 1 WHERE id = _broadcast_id;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_radiate_broadcasts_updated_at ON public.radiate_broadcasts;
CREATE TRIGGER trg_radiate_broadcasts_updated_at
  BEFORE UPDATE ON public.radiate_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
