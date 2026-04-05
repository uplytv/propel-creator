
BEGIN;

CREATE TABLE IF NOT EXISTS public.live_purchase_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.live_purchases(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  full_name text NOT NULL DEFAULT '',
  address_line1 text NOT NULL DEFAULT '',
  address_line2 text,
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'US',
  phone text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.live_purchase_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own addresses" ON public.live_purchase_addresses FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Buyers insert addresses" ON public.live_purchase_addresses FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Creators view buyer addresses" ON public.live_purchase_addresses FOR SELECT TO authenticated USING (purchase_id IN (SELECT id FROM public.live_purchases WHERE creator_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.live_purchase_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.live_purchases(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'unfulfilled',
  tracking_number text,
  carrier text,
  tracking_url text,
  notes text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.live_purchase_fulfillments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator manages own fulfillments" ON public.live_purchase_fulfillments FOR ALL TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Buyer views own fulfillments" ON public.live_purchase_fulfillments FOR SELECT TO authenticated USING (purchase_id IN (SELECT id FROM public.live_purchases WHERE buyer_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.live_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_product_id uuid NOT NULL REFERENCES public.live_products(id) ON DELETE CASCADE,
  label text NOT NULL,
  options text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.live_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read variants" ON public.live_product_variants FOR SELECT USING (true);
CREATE POLICY "Creator manage variants" ON public.live_product_variants FOR ALL TO authenticated USING (live_product_id IN (SELECT id FROM public.live_products WHERE creator_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.creator_shopify_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE,
  shop_domain text NOT NULL,
  access_token text NOT NULL,
  shop_name text,
  currency text DEFAULT 'USD',
  is_active boolean DEFAULT true,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.creator_shopify_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own Shopify store" ON public.creator_shopify_stores FOR ALL TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.live_flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_product_id uuid NOT NULL REFERENCES public.live_products(id) ON DELETE CASCADE,
  stream_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  discount_percent integer NOT NULL DEFAULT 0,
  original_price numeric NOT NULL,
  sale_price numeric NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 60,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.live_flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read flash sales" ON public.live_flash_sales FOR SELECT USING (true);
CREATE POLICY "Creator manage flash sales" ON public.live_flash_sales FOR ALL TO authenticated USING (creator_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.live_product_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_product_id uuid NOT NULL REFERENCES public.live_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(live_product_id, user_id)
);
ALTER TABLE public.live_product_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON public.live_product_wishlist FOR ALL TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS condition text DEFAULT 'new';
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS shipping_price numeric DEFAULT 0;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS free_shipping boolean DEFAULT false;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS shopify_product_id text;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS shopify_variant_id text;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS shopify_checkout_url text;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS additional_images text[] DEFAULT '{}';
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS reserve_price numeric;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS buy_now_price numeric;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS auto_end_auction boolean DEFAULT true;

ALTER TABLE public.live_purchases ADD COLUMN IF NOT EXISTS variant_selected text;
ALTER TABLE public.live_purchases ADD COLUMN IF NOT EXISTS buyer_message text;
ALTER TABLE public.live_purchases ADD COLUMN IF NOT EXISTS shipping_price numeric DEFAULT 0;
ALTER TABLE public.live_purchases ADD COLUMN IF NOT EXISTS total_amount numeric;

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_flash_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_purchase_fulfillments;

COMMIT;
