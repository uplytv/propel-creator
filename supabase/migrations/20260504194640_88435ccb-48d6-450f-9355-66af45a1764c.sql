
-- Portrait live commerce: products attached to a live stream
CREATE TABLE IF NOT EXISTS public.live_stream_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.mux_live_streams(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  is_currently_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lsp_stream ON public.live_stream_products(stream_id);
CREATE INDEX IF NOT EXISTS idx_lsp_featured ON public.live_stream_products(stream_id) WHERE is_currently_featured = true;

ALTER TABLE public.live_stream_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stream owner manages products" ON public.live_stream_products;
CREATE POLICY "stream owner manages products" ON public.live_stream_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.mux_live_streams ls WHERE ls.id = stream_id AND ls.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.mux_live_streams ls WHERE ls.id = stream_id AND ls.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "anyone can view stream products" ON public.live_stream_products;
CREATE POLICY "anyone can view stream products" ON public.live_stream_products
  FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_products;

-- TV apps: signed-token product features for QR commerce
CREATE TABLE IF NOT EXISTS public.tv_product_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.mux_live_streams(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  checkout_token text UNIQUE NOT NULL,
  featured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  dismissed_at timestamptz,
  qr_scanned_at timestamptz,
  purchased_at timestamptz,
  purchaser_user_id uuid,
  amount_cents int
);

CREATE INDEX IF NOT EXISTS idx_tvpf_stream_active ON public.tv_product_features(stream_id) WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tvpf_token ON public.tv_product_features(checkout_token);

ALTER TABLE public.tv_product_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stream owner manages tv features" ON public.tv_product_features;
CREATE POLICY "stream owner manages tv features" ON public.tv_product_features
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.mux_live_streams ls WHERE ls.id = stream_id AND ls.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.mux_live_streams ls WHERE ls.id = stream_id AND ls.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "public can read active tv features" ON public.tv_product_features;
CREATE POLICY "public can read active tv features" ON public.tv_product_features
  FOR SELECT USING (dismissed_at IS NULL AND expires_at > now());

ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_product_features;
