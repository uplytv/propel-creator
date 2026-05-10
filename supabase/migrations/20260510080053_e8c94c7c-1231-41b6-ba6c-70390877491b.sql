-- Music tips
CREATE TABLE IF NOT EXISTS public.music_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  track_id UUID,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_music_tips_artist ON public.music_tips(artist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_tips_fan ON public.music_tips(fan_id, created_at DESC);
ALTER TABLE public.music_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tips: fan reads own" ON public.music_tips FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "Tips: artist reads own received" ON public.music_tips FOR SELECT USING (auth.uid() = artist_id);
CREATE POLICY "Tips: fan inserts own" ON public.music_tips FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- Artist merch
CREATE TABLE IF NOT EXISTS public.artist_merch (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  external_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  kind TEXT NOT NULL DEFAULT 'physical' CHECK (kind IN ('physical','digital')),
  in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_artist_merch_artist ON public.artist_merch(artist_id, created_at DESC);
ALTER TABLE public.artist_merch ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merch: public read" ON public.artist_merch FOR SELECT USING (true);
CREATE POLICY "Merch: artist insert" ON public.artist_merch FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Merch: artist update" ON public.artist_merch FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Merch: artist delete" ON public.artist_merch FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER artist_merch_updated_at BEFORE UPDATE ON public.artist_merch
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Artist subscription tiers
CREATE TABLE IF NOT EXISTS public.artist_sub_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents >= 0),
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_artist_sub_tiers_artist ON public.artist_sub_tiers(artist_id);
ALTER TABLE public.artist_sub_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SubTiers: public read" ON public.artist_sub_tiers FOR SELECT USING (true);
CREATE POLICY "SubTiers: artist insert" ON public.artist_sub_tiers FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "SubTiers: artist update" ON public.artist_sub_tiers FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "SubTiers: artist delete" ON public.artist_sub_tiers FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER artist_sub_tiers_updated_at BEFORE UPDATE ON public.artist_sub_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Artist subscriptions (memberships)
CREATE TABLE IF NOT EXISTS public.artist_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  tier_id UUID NOT NULL REFERENCES public.artist_sub_tiers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','past_due')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fan_id, artist_id)
);
CREATE INDEX IF NOT EXISTS idx_artist_subs_artist ON public.artist_subscriptions(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_subs_fan ON public.artist_subscriptions(fan_id);
ALTER TABLE public.artist_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ArtistSubs: fan reads own" ON public.artist_subscriptions FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "ArtistSubs: artist reads own" ON public.artist_subscriptions FOR SELECT USING (auth.uid() = artist_id);
CREATE POLICY "ArtistSubs: fan insert" ON public.artist_subscriptions FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "ArtistSubs: fan update own" ON public.artist_subscriptions FOR UPDATE USING (auth.uid() = fan_id);
CREATE TRIGGER artist_subscriptions_updated_at BEFORE UPDATE ON public.artist_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();