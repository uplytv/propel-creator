-- ═══════════════════════════════════════════════════════════════════════════
-- Atomic wallet credit for stripe-webhook (BUG 3). ADDITIVE ONLY — no existing
-- tables/columns touched, no destructive statements.
--
-- Problem: the webhook's updateWallet was read-then-write (SELECT
-- available_balance/lifetime_earned, then UPDATE with computed values), so two
-- concurrent webhook deliveries crediting the same creator could interleave
-- and LOSE a credit. This RPC does guard + ledger insert + single-statement
-- atomic increment in ONE database transaction.
--
-- Semantics replicated EXACTLY from updateWallet (stripe-webhook/index.ts):
--   * Per-payment-intent idempotency guard: any COMPLETED transactions row
--     with the same stripe_payment_intent_id (any wallet) short-circuits.
--     A NULL payment intent runs no guard (same as today).
--   * transactions row shape: amount = gross, net_amount = net,
--     platform_fee_amount = fee, type 'earn', status 'completed',
--     stripe_payment_intent_id, description, completed_at = now().
--   * Wallet increment: available_balance += net, lifetime_earned += net —
--     as a relative single-statement UPDATE (no read-then-write).
--   * NET/FEE ARE COMPUTED BY THE CALLER (95/5 split untouched); this
--     function only records them.
-- Deliberate improvement over updateWallet: if the creator has no wallet row
-- yet, one is created (updateWallet silently dropped the credit).
--
-- NOT for finalize-cart-order: the cart flow's guard is scoped per
-- (payment_intent, wallet) because one cart PI legitimately credits several
-- creators. This RPC implements the webhook's GLOBAL per-PI guard; using it
-- for carts would wrongly skip the second creator. Cart behavior unchanged.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.credit_wallet_atomic(
  p_user_id uuid,
  p_net numeric,
  p_gross numeric,
  p_fee numeric,
  p_description text,
  p_payment_intent_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_tx_id uuid;
BEGIN
  -- Serialize concurrent credits for the same creator (transaction-scoped
  -- advisory lock, auto-released on commit/rollback). This makes BOTH the
  -- guard check below and first-credit wallet creation race-safe even though
  -- wallets has no UNIQUE(user_id) constraint we can rely on.
  PERFORM pg_advisory_xact_lock(hashtext('credit_wallet_atomic'), hashtext(p_user_id::text));

  -- Per-payment-intent idempotency guard — EXACT updateWallet semantics:
  -- any completed transaction with this PI (regardless of wallet) means the
  -- credit already happened. NULL PI = no guard, same as today.
  IF p_payment_intent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE stripe_payment_intent_id = p_payment_intent_id
        AND status = 'completed'
    ) THEN
      RETURN jsonb_build_object('credited', false, 'reason', 'duplicate_payment_intent');
    END IF;
  END IF;

  -- Resolve the creator wallet; create it on first credit. Oldest row wins if
  -- historical duplicates exist (mirrors maybeSingle()'s intent of one wallet
  -- per user without failing on legacy data).
  SELECT id INTO v_wallet_id
    FROM public.wallets
   WHERE user_id = p_user_id
   ORDER BY created_at ASC NULLS LAST
   LIMIT 1;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, available_balance, lifetime_earned)
    VALUES (p_user_id, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  -- Ledger row — same shape updateWallet inserts today.
  INSERT INTO public.transactions (
    wallet_id, amount, net_amount, platform_fee_amount,
    type, status, stripe_payment_intent_id, description, completed_at
  ) VALUES (
    v_wallet_id, p_gross, p_net, p_fee,
    'earn', 'completed', p_payment_intent_id, p_description, now()
  )
  RETURNING id INTO v_tx_id;

  -- Single-statement ATOMIC increment — the fix. No values are read into the
  -- application first, so concurrent credits can never overwrite each other.
  UPDATE public.wallets
     SET available_balance = COALESCE(available_balance, 0) + p_net,
         lifetime_earned  = COALESCE(lifetime_earned, 0) + p_net
   WHERE id = v_wallet_id;

  RETURN jsonb_build_object(
    'credited', true,
    'wallet_id', v_wallet_id,
    'transaction_id', v_tx_id
  );
END;
$$;

-- This function moves money — service role (the webhook) ONLY.
REVOKE ALL ON FUNCTION public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_atomic(uuid, numeric, numeric, numeric, text, text) TO service_role;

-- Speeds up the per-PI guard (transactions has no index on this column).
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi_completed
  ON public.transactions (stripe_payment_intent_id)
  WHERE status = 'completed' AND stripe_payment_intent_id IS NOT NULL;
