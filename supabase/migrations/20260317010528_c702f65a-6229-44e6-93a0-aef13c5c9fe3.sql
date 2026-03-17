
-- Add stripe_price_id to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Create product_purchases table
CREATE TABLE IF NOT EXISTS public.product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  stripe_payment_intent_id text,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view their purchases" ON public.product_purchases FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Service role can insert purchases" ON public.product_purchases FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

-- Create credit_packages table
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credits integer NOT NULL,
  price_usd numeric NOT NULL,
  stripe_price_id text,
  label text NOT NULL
);
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view credit packages" ON public.credit_packages FOR SELECT USING (true);

-- Add credits column to wallets if not exists
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0;

-- Add wallet_id to transactions for proper scoping
-- Add purchase_type metadata to help webhook routing

-- Enable realtime for product_purchases
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_purchases;
