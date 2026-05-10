-- Preorder campaigns
CREATE TABLE public.music_preorder_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL DEFAULT 'vinyl' CHECK (format IN ('vinyl','cd','cassette','box_set','merch_bundle')),
  cover_url TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  goal_units INTEGER NOT NULL DEFAULT 100 CHECK (goal_units > 0),
  units_reserved INTEGER NOT NULL DEFAULT 0 CHECK (units_reserved >= 0),
  ships_by DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','funded','shipped','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_preorder_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active preorder campaigns"
ON public.music_preorder_campaigns FOR SELECT
USING (status <> 'draft' OR artist_id = auth.uid());

CREATE POLICY "Artists manage own preorder campaigns"
ON public.music_preorder_campaigns FOR ALL
USING (artist_id = auth.uid())
WITH CHECK (artist_id = auth.uid());

CREATE INDEX idx_mpc_artist ON public.music_preorder_campaigns(artist_id);
CREATE INDEX idx_mpc_status ON public.music_preorder_campaigns(status);

CREATE TRIGGER trg_mpc_updated_at
BEFORE UPDATE ON public.music_preorder_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Preorders
CREATE TABLE public.music_preorders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.music_preorder_campaigns(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  shipping_name TEXT,
  shipping_address JSONB,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','paid','shipped','canceled','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans view own preorders"
ON public.music_preorders FOR SELECT
USING (fan_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.music_preorder_campaigns c
  WHERE c.id = campaign_id AND c.artist_id = auth.uid()
));

CREATE POLICY "Fans create own preorders"
ON public.music_preorders FOR INSERT
WITH CHECK (fan_id = auth.uid());

CREATE POLICY "Fans update own preorders"
ON public.music_preorders FOR UPDATE
USING (fan_id = auth.uid())
WITH CHECK (fan_id = auth.uid());

CREATE POLICY "Artists update preorders on own campaigns"
ON public.music_preorders FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.music_preorder_campaigns c
  WHERE c.id = campaign_id AND c.artist_id = auth.uid()
));

CREATE INDEX idx_mpo_campaign ON public.music_preorders(campaign_id);
CREATE INDEX idx_mpo_fan ON public.music_preorders(fan_id);

CREATE TRIGGER trg_mpo_updated_at
BEFORE UPDATE ON public.music_preorders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-increment units_reserved
CREATE OR REPLACE FUNCTION public.increment_preorder_units()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_preorder_campaigns
    SET units_reserved = units_reserved + NEW.quantity
    WHERE id = NEW.campaign_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_preorder_campaigns
    SET units_reserved = GREATEST(0, units_reserved - OLD.quantity)
    WHERE id = OLD.campaign_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_mpo_count
AFTER INSERT OR DELETE ON public.music_preorders
FOR EACH ROW EXECUTE FUNCTION public.increment_preorder_units();