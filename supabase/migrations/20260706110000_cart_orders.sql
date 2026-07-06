
-- Cart orders: server-side record of a multi-item cart checkout.
-- Created by create-cart-checkout BEFORE the Stripe session (metadata only carries
-- cart_order_id — item JSON can exceed Stripe's 500-char metadata value limit),
-- fulfilled idempotently by finalize-cart-order (pending -> processing -> completed).

CREATE TABLE IF NOT EXISTS public.cart_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cart_orders_buyer ON public.cart_orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_orders_status ON public.cart_orders(status) WHERE status <> 'completed';

ALTER TABLE public.cart_orders ENABLE ROW LEVEL SECURITY;

-- Buyers can read their own orders; all writes go through service-role edge functions.
CREATE POLICY "Buyers view own cart orders" ON public.cart_orders
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Service role full access cart orders" ON public.cart_orders
  TO service_role USING (true) WITH CHECK (true);
