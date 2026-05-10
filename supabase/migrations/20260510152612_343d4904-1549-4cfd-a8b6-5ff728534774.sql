
CREATE TABLE IF NOT EXISTS public.music_fan_club_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfct_artist ON public.music_fan_club_tiers(artist_id);
ALTER TABLE public.music_fan_club_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers public read" ON public.music_fan_club_tiers FOR SELECT USING (true);
CREATE POLICY "Artist manages own tiers" ON public.music_fan_club_tiers FOR ALL TO authenticated
  USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);
CREATE TRIGGER trg_mfct_updated_at BEFORE UPDATE ON public.music_fan_club_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.music_fan_club_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  tier_id UUID NOT NULL REFERENCES public.music_fan_club_tiers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','expired')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fan_id, tier_id)
);
CREATE INDEX IF NOT EXISTS idx_mfcs_fan ON public.music_fan_club_subscriptions(fan_id);
CREATE INDEX IF NOT EXISTS idx_mfcs_artist ON public.music_fan_club_subscriptions(artist_id);
ALTER TABLE public.music_fan_club_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fan views own subs" ON public.music_fan_club_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = fan_id OR auth.uid() = artist_id);
CREATE POLICY "Fan creates own subs" ON public.music_fan_club_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fan updates own subs" ON public.music_fan_club_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = fan_id);
CREATE POLICY "Fan deletes own subs" ON public.music_fan_club_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = fan_id);
CREATE TRIGGER trg_mfcs_updated_at BEFORE UPDATE ON public.music_fan_club_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.music_fan_club_exclusives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  min_tier_id UUID REFERENCES public.music_fan_club_tiers(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('post','audio','video','image')),
  title TEXT NOT NULL,
  body TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfce_artist ON public.music_fan_club_exclusives(artist_id);
ALTER TABLE public.music_fan_club_exclusives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exclusives metadata public" ON public.music_fan_club_exclusives FOR SELECT USING (true);
CREATE POLICY "Artist manages own exclusives" ON public.music_fan_club_exclusives FOR ALL TO authenticated
  USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);
CREATE TRIGGER trg_mfce_updated_at BEFORE UPDATE ON public.music_fan_club_exclusives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_fan_club_access(_artist_id UUID, _tier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.music_fan_club_subscriptions s
    JOIN public.music_fan_club_tiers t ON t.id = s.tier_id
    WHERE s.fan_id = auth.uid()
      AND s.artist_id = _artist_id
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND (
        _tier_id IS NULL
        OR t.price_cents >= (SELECT price_cents FROM public.music_fan_club_tiers WHERE id = _tier_id)
      )
  );
$$;
