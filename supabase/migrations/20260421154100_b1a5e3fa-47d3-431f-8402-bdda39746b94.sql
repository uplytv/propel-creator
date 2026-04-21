CREATE TABLE IF NOT EXISTS public.content_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video','clip','recording','stream','post')),
  tier TEXT NOT NULL CHECK (tier IN ('starter','growth','pro')),
  amount_usd NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','canceled','refunded')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_boosts_active
  ON public.content_boosts (status, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_content_boosts_creator ON public.content_boosts (creator_id);
CREATE INDEX IF NOT EXISTS idx_content_boosts_content ON public.content_boosts (content_type, content_id);

ALTER TABLE public.content_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active boosts are readable by everyone"
  ON public.content_boosts FOR SELECT
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Owners can read all their boosts"
  ON public.content_boosts FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Owners can insert their own boosts"
  ON public.content_boosts FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Owners can cancel their own boosts"
  ON public.content_boosts FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Admins can manage all boosts"
  ON public.content_boosts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_content_boosts_updated_at
  BEFORE UPDATE ON public.content_boosts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();