
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.track_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, buyer_id, stripe_session_id)
);

CREATE INDEX IF NOT EXISTS idx_track_purchases_buyer ON public.track_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_track_purchases_creator ON public.track_purchases(creator_id);
CREATE INDEX IF NOT EXISTS idx_track_purchases_track ON public.track_purchases(track_id);

ALTER TABLE public.track_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own purchases"
  ON public.track_purchases FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Creators view track purchases"
  ON public.track_purchases FOR SELECT USING (auth.uid() = creator_id);

-- Inserts only via service role (edge function)

CREATE OR REPLACE FUNCTION public.has_purchased_track(_user_id UUID, _track_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.track_purchases
    WHERE buyer_id = _user_id AND track_id = _track_id
  );
$$;

REVOKE ALL ON FUNCTION public.has_purchased_track(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_purchased_track(UUID, UUID) TO authenticated, anon;
