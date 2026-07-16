-- ============================================================================
-- 50% AFFILIATE PROGRAM — commission rails for platform-plan referrals.
--
-- Additive only. The Stripe webhook and Mux webhook are NOT touched:
-- commission computation happens in the scheduled affiliate-commission-
-- reconciler edge function (cron below), never in a webhook.
--
-- MONEY MODEL (do not change without explicit instruction):
--   Affiliate commissions are a PLATFORM MARKETING COST paid by UPLY out of
--   its own plan revenue ($97 / $297 / $497 subscriptions). They NEVER touch
--   creator money and NEVER alter the 95/5 creator payout split. The referred
--   customer pays exactly the same price with or without an affiliate code.
--
-- SECURITY (C-1 architecture preserved):
--   * track-affiliate-conversion keeps recording PENDING, zero-commission
--     conversions (client-supplied amounts are never trusted).
--   * The reconciler (service role, cron) computes commission amounts
--     SERVER-SIDE from Stripe-verified paid invoices only.
--   * Payouts remain admin-approved via stripe-pay-affiliate.
--   * affiliate_conversions already has RLS (owner SELECT, admin SELECT/
--     UPDATE — 20260311190622); the new columns below inherit those policies.
--     No new client write path is opened by this migration.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- 1. Additive columns on affiliate_conversions
-- ---------------------------------------------------------------------------
ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS mrr_cents integer,
  ADD COLUMN IF NOT EXISTS commission_pct integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS paid_invoice_id text;

-- Idempotency backstop for the reconciler: one commission row per paid
-- Stripe invoice, enforced at the database level (concurrent runs cannot
-- double-credit — the second insert fails with 23505 and is skipped).
CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliate_conversions_paid_invoice
  ON public.affiliate_conversions (paid_invoice_id)
  WHERE paid_invoice_id IS NOT NULL;

-- Fast "already processed this subscription?" lookups for the reconciler.
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_stripe_sub
  ON public.affiliate_conversions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Widen CHECK constraints (values only — widening, never narrowing)
--    * conversion_type gains 'platform_subscription' (reconciler rows).
--    * status gains 'approved' / 'pending_stripe_connect' / 'void' — the
--      admin-approval flow in stripe-pay-affiliate already writes 'approved'
--      and 'pending_stripe_connect'; the original CHECK ('pending','paid')
--      predates it and would reject those writes.
-- ---------------------------------------------------------------------------
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

COMMENT ON COLUMN public.affiliate_conversions.plan IS
  'Platform plan key at conversion time (starter | unlimited | agency_pro). Set by the reconciler only.';
COMMENT ON COLUMN public.affiliate_conversions.mrr_cents IS
  'amount_paid (cents) of the Stripe invoice that earned this commission. Server-verified — never client-supplied.';
COMMENT ON COLUMN public.affiliate_conversions.commission_pct IS
  'Commission rate applied (v1: 50 = 50% of the first paid invoice). UPLY marketing cost — never creator money, never the 95/5 split.';
COMMENT ON COLUMN public.affiliate_conversions.paid_invoice_id IS
  'Stripe invoice id that funded this commission. Partial UNIQUE index dedupes reconciler re-runs.';

-- ---------------------------------------------------------------------------
-- 3. Admin-only reconciler summary RPC (read-only rollup for ops)
--    SECURITY DEFINER so it can aggregate across all rows, but it refuses
--    any caller who is not an admin (canonical has_role check).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.affiliate_reconciler_summary()
RETURNS TABLE (
  status text,
  conversions bigint,
  commission_total numeric,
  mrr_cents_total bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'affiliate_reconciler_summary: admin only';
  END IF;
  RETURN QUERY
    SELECT c.status,
           count(*)::bigint,
           COALESCE(sum(c.commission_amount), 0)::numeric,
           COALESCE(sum(c.mrr_cents), 0)::bigint
    FROM public.affiliate_conversions c
    WHERE c.conversion_type = 'platform_subscription'
    GROUP BY c.status;
END;
$$;

REVOKE ALL ON FUNCTION public.affiliate_reconciler_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.affiliate_reconciler_summary() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Cron: run the reconciler every 6 hours (platform-dunning precedent —
--    secret header pulled from Vault; 'AFFILIATE_RECONCILER_CRON_SECRET'
--    must exist in Vault AND be set as an edge-function secret).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('affiliate-commission-reconciler-6h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'affiliate-commission-reconciler-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/affiliate-commission-reconciler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-affiliate-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'AFFILIATE_RECONCILER_CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
