-- === Affiliate reconciler columns (from 20260707150000_affiliate_50.sql) ===
ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS mrr_cents integer,
  ADD COLUMN IF NOT EXISTS commission_pct integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS paid_invoice_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliate_conversions_paid_invoice
  ON public.affiliate_conversions (paid_invoice_id)
  WHERE paid_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_stripe_sub
  ON public.affiliate_conversions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.affiliate_conversions
  DROP CONSTRAINT IF EXISTS affiliate_conversions_conversion_type_check;
ALTER TABLE public.affiliate_conversions
  ADD CONSTRAINT affiliate_conversions_conversion_type_check
  CHECK (conversion_type IN ('signup', 'purchase', 'platform_subscription'));

ALTER TABLE public.affiliate_conversions
  DROP CONSTRAINT IF EXISTS affiliate_conversions_status_check;
ALTER TABLE public.affiliate_conversions
  ADD CONSTRAINT affiliate_conversions_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'pending_stripe_connect', 'void'));

-- === Discover: missing mux_live_streams columns ===
ALTER TABLE public.mux_live_streams
  ADD COLUMN IF NOT EXISTS is_primetime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_mux_live_streams_scheduled_at
  ON public.mux_live_streams (scheduled_at)
  WHERE scheduled_at IS NOT NULL;
