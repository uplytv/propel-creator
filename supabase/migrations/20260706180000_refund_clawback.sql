-- ═══════════════════════════════════════════════════════════════════════════
-- Refund clawback idempotency guard for stripe-webhook (charge.refunded).
-- ADDITIVE ONLY — no existing tables/columns touched.
--
-- One row per Stripe refund. UNIQUE(refund_id) is the idempotency claim: the
-- webhook inserts a claim row before decrementing the creator wallet, so a
-- redelivered/duplicated refund event can never double-decrement. The applied
-- amounts (clawback_amount / wallet_decrement / shortfall) are recorded after
-- the wallet update; clawback_amount IS NULL marks a claim whose apply step
-- crashed and may be safely retried.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stripe_refund_clawbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id text NOT NULL UNIQUE,          -- Stripe refund id (re_...) or "<charge_id>:<amount_refunded>" fallback
  stripe_charge_id text,
  stripe_payment_intent_id text,
  wallet_id uuid,
  clawback_amount numeric,                 -- intended net clawback (95% share), dollars; NULL until applied
  wallet_decrement numeric,                -- actually removed from the wallet (floored at zero)
  shortfall numeric,                       -- clawback_amount - wallet_decrement (unrecoverable from wallet)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Successive partial refunds are summed per payment intent
CREATE INDEX IF NOT EXISTS idx_stripe_refund_clawbacks_pi
  ON public.stripe_refund_clawbacks (stripe_payment_intent_id);

-- RLS: SERVICE-ROLE ONLY. Enabling RLS with NO policies denies all access to
-- anon/authenticated; the service role (used by the webhook) bypasses RLS.
-- Same pattern as stream_playback_vault.
ALTER TABLE public.stripe_refund_clawbacks ENABLE ROW LEVEL SECURITY;
