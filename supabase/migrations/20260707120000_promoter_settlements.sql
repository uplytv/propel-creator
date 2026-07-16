-- ═══════════════════════════════════════════════════════════════════════════
-- Promoter SETTLEMENTS — internal wallet-ledger payouts (closes the Posh gap).
-- ADDITIVE ONLY. No Stripe money movement: this moves credit between UPLY
-- wallets (creator wallet -> promoter wallet). Real cash still exits ONLY via
-- the existing payout system. The 95/5 platform split is untouched — the
-- creator pays commission out of their own (already net) wallet balance.
--
-- Pieces:
--   1. event_promoters.commission_pct (nullable, 0–50). NULL = no auto-payout.
--   2. transactions.type CHECK widened to allow 'promoter_payout'. This is a
--      pure WIDENING (adds one allowed value; every existing row still
--      satisfies the new constraint) — non-destructive.
--   3. promoter_settlements — append-only settlement ledger. Creator reads own
--      events' settlements; promoter reads own; NO client writes.
--   4. settle_event_promoters(p_event_id) — SECURITY DEFINER RPC, creator-only.
--      Idempotent by construction: owed = floor(lifetime attributed * pct/100)
--      minus already-settled total; re-running settles only the delta.
--      Atomicity mirrors credit_wallet_atomic: advisory locks + relative
--      single-statement wallet updates, all inside one DB transaction.
-- ═══════════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------------
-- 1. commission_pct on event_promoters (NULL = manual/no auto-payout)
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_promoters
  ADD COLUMN IF NOT EXISTS commission_pct numeric
  CHECK (commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 50));

COMMENT ON COLUMN public.event_promoters.commission_pct IS
  'Auto-payout commission % (0–50) of attributed order subtotal. NULL = creator pays manually. Only meaningful when promoter_user_id is set.';

-- Creators already manage this row via the existing "Event managers manage
-- promoters" FOR ALL policy — no new write policy needed for commission_pct.

-- ---------------------------------------------------------------------------
-- 2. Widen transactions.type CHECK to include 'promoter_payout'
--    (original inline check auto-named transactions_type_check in
--     20260309000331; widening only — all existing rows remain valid)
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('earn','withdrawal','fee','refund','tip','promoter_payout'));

-- ---------------------------------------------------------------------------
-- 3. promoter_settlements — append-only settlement ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promoter_settlements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  promoter_id   uuid NOT NULL REFERENCES public.event_promoters(id) ON DELETE CASCADE,
  creator_id    uuid NOT NULL,          -- payer (event creator) — denormalized
  amount_cents  bigint  NOT NULL CHECK (amount_cents > 0),
  sales_count   integer NOT NULL DEFAULT 0 CHECK (sales_count >= 0),
  period_end    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.promoter_settlements IS
  'Append-only internal wallet-ledger promoter payouts. Written ONLY by settle_event_promoters(); sum(amount_cents) per promoter is the already-settled total that makes settlement idempotent.';

CREATE INDEX IF NOT EXISTS idx_promoter_settlements_event
  ON public.promoter_settlements (event_id);
CREATE INDEX IF NOT EXISTS idx_promoter_settlements_promoter
  ON public.promoter_settlements (promoter_id);

ALTER TABLE public.promoter_settlements ENABLE ROW LEVEL SECURITY;

-- Creator reads settlements for their own events.
CREATE POLICY "Creators read own event settlements"
  ON public.promoter_settlements FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

-- A promoter who is a UPLY user reads their own settlements.
CREATE POLICY "Promoters read own settlements"
  ON public.promoter_settlements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_promoters p
    WHERE p.id = promoter_id AND p.promoter_user_id = auth.uid()
  ));

-- NO client INSERT/UPDATE/DELETE policies => default-deny. Only the
-- SECURITY DEFINER RPC below writes rows. Belt and braces on grants too:
REVOKE INSERT, UPDATE, DELETE ON public.promoter_settlements FROM anon, authenticated;
REVOKE ALL ON public.promoter_settlements FROM public;

-- ---------------------------------------------------------------------------
-- 4. settle_event_promoters(p_event_id) — creator-only settlement RPC
-- ---------------------------------------------------------------------------
-- For each promoter on the event with commission_pct set AND a linked UPLY
-- account:
--   owed = floor(sum(attributed amount_cents) * pct / 100) - already settled
--   if owed > 0 and creator wallet covers it: move the credit atomically
--   (settlement row + debit/credit transactions + wallet updates), else skip
--   with a per-promoter status. Returns a jsonb array of per-promoter results:
--   [{promoter_id, owed_cents, settled_cents, already_settled_cents, status}]
--   status ∈ 'settled' | 'insufficient_balance' | 'nothing_owed' | 'no_wallet'
--
-- Concurrency (mirrors credit_wallet_atomic's rigor):
--   * per-event advisory xact lock serializes concurrent settle runs of the
--     same event, so the owed-minus-settled computation can never double-pay;
--   * wallet advisory locks use the SAME namespace as credit_wallet_atomic
--     ('credit_wallet_atomic', keyed by user id) so settlement serializes
--     against concurrent webhook credits; acquired in sorted-uuid order so two
--     multi-wallet settle runs can never deadlock;
--   * wallet balance changes are relative single-statement UPDATEs — the
--     creator debit carries its own balance guard in the WHERE clause, so an
--     overdraft is impossible even without the locks;
--   * everything runs in ONE transaction: a failure rolls back all of it —
--     no wallet movement without its settlement + transactions rows.
CREATE OR REPLACE FUNCTION public.settle_event_promoters(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id        uuid;
  v_creator_wallet_id uuid;
  v_results           jsonb := '[]'::jsonb;
  v_lock_uid          uuid;
  r                   RECORD;
  v_earned_cents      bigint;
  v_sales_count       integer;
  v_settled_cents     bigint;
  v_owed_cents        bigint;
  v_amount            numeric;   -- dollars (wallets/transactions are decimal(10,2))
  v_promoter_wallet_id uuid;
  v_settlement_id     uuid;
BEGIN
  -- Guard: ONLY the event creator may move money out of their wallet.
  -- (Deliberately stricter than can_manage_event — staff cannot spend the
  -- creator's balance.)
  SELECT creator_id INTO v_creator_id FROM public.events WHERE id = p_event_id;
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'settle_event_promoters: event % not found', p_event_id;
  END IF;
  IF auth.uid() IS NULL OR auth.uid() <> v_creator_id THEN
    RAISE EXCEPTION 'settle_event_promoters: only the event creator can settle promoter payouts';
  END IF;

  -- Serialize concurrent settle runs for this event (double-click / two tabs):
  -- the owed-minus-settled math below is only race-free under this lock.
  PERFORM pg_advisory_xact_lock(hashtext('settle_event_promoters'), hashtext(p_event_id::text));

  -- Serialize against concurrent wallet credits (same namespace as
  -- credit_wallet_atomic). Sorted order => no deadlock between settle runs.
  FOR v_lock_uid IN
    SELECT DISTINCT u FROM (
      SELECT v_creator_id AS u
      UNION
      SELECT ep.promoter_user_id
        FROM public.event_promoters ep
       WHERE ep.event_id = p_event_id
         AND ep.commission_pct IS NOT NULL
         AND ep.promoter_user_id IS NOT NULL
    ) s ORDER BY u
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext('credit_wallet_atomic'), hashtext(v_lock_uid::text));
  END LOOP;

  -- Resolve the creator's wallet (oldest wins — same defensive pattern as
  -- credit_wallet_atomic). No wallet => nothing can be paid.
  SELECT id INTO v_creator_wallet_id
    FROM public.wallets
   WHERE user_id = v_creator_id
   ORDER BY created_at ASC NULLS LAST
   LIMIT 1;

  FOR r IN
    SELECT ep.id, ep.promoter_user_id, ep.commission_pct, ep.code
      FROM public.event_promoters ep
     WHERE ep.event_id = p_event_id
       AND ep.commission_pct IS NOT NULL
       AND ep.promoter_user_id IS NOT NULL
     ORDER BY ep.created_at ASC
  LOOP
    -- Lifetime attributed subtotal for this promoter on this event.
    SELECT COALESCE(SUM(s.amount_cents), 0)::bigint, COUNT(*)::integer
      INTO v_earned_cents, v_sales_count
      FROM public.event_promoter_sales s
     WHERE s.promoter_id = r.id;

    -- Already settled (the idempotency anchor).
    SELECT COALESCE(SUM(ps.amount_cents), 0)::bigint
      INTO v_settled_cents
      FROM public.promoter_settlements ps
     WHERE ps.promoter_id = r.id;

    -- floor() of the LIFETIME commission, minus already settled: repeated
    -- runs pay exactly the delta and rounding never drifts across runs.
    v_owed_cents := floor(v_earned_cents * r.commission_pct / 100)::bigint - v_settled_cents;

    IF v_owed_cents <= 0 THEN
      v_results := v_results || jsonb_build_object(
        'promoter_id', r.id,
        'owed_cents', 0,
        'settled_cents', 0,
        'already_settled_cents', v_settled_cents,
        'status', 'nothing_owed');
      CONTINUE;
    END IF;

    IF v_creator_wallet_id IS NULL THEN
      v_results := v_results || jsonb_build_object(
        'promoter_id', r.id,
        'owed_cents', v_owed_cents,
        'settled_cents', 0,
        'already_settled_cents', v_settled_cents,
        'status', 'no_wallet');
      CONTINUE;
    END IF;

    v_amount := v_owed_cents::numeric / 100;  -- exact 2-dp dollars

    -- ATOMIC conditional debit: single statement, balance guard in the WHERE.
    -- If the balance doesn't cover the full owed amount, nothing moves.
    UPDATE public.wallets
       SET available_balance = COALESCE(available_balance, 0) - v_amount
     WHERE id = v_creator_wallet_id
       AND COALESCE(available_balance, 0) >= v_amount;

    IF NOT FOUND THEN
      v_results := v_results || jsonb_build_object(
        'promoter_id', r.id,
        'owed_cents', v_owed_cents,
        'settled_cents', 0,
        'already_settled_cents', v_settled_cents,
        'status', 'insufficient_balance');
      CONTINUE;
    END IF;

    -- Settlement row (the append-only claim that makes re-runs pay 0).
    INSERT INTO public.promoter_settlements (event_id, promoter_id, creator_id, amount_cents, sales_count)
    VALUES (p_event_id, r.id, v_creator_id, v_owed_cents, v_sales_count)
    RETURNING id INTO v_settlement_id;

    -- Creator debit ledger row (negative amount, references the settlement).
    INSERT INTO public.transactions (wallet_id, amount, net_amount, type, status, description, reference_id, completed_at)
    VALUES (v_creator_wallet_id, -v_amount, -v_amount, 'promoter_payout', 'completed',
            'Promoter payout — ' || r.code, v_settlement_id, now());

    -- Resolve/create the promoter's wallet (first-credit creation is safe
    -- under the advisory lock — same pattern as credit_wallet_atomic).
    SELECT id INTO v_promoter_wallet_id
      FROM public.wallets
     WHERE user_id = r.promoter_user_id
     ORDER BY created_at ASC NULLS LAST
     LIMIT 1;
    IF v_promoter_wallet_id IS NULL THEN
      INSERT INTO public.wallets (user_id, available_balance, lifetime_earned)
      VALUES (r.promoter_user_id, 0, 0)
      RETURNING id INTO v_promoter_wallet_id;
    END IF;

    -- Promoter credit ledger row (positive, references the settlement).
    INSERT INTO public.transactions (wallet_id, amount, net_amount, type, status, description, reference_id, completed_at)
    VALUES (v_promoter_wallet_id, v_amount, v_amount, 'promoter_payout', 'completed',
            'Promoter commission — ' || r.code, v_settlement_id, now());

    -- Relative single-statement increment — no read-then-write.
    UPDATE public.wallets
       SET available_balance = COALESCE(available_balance, 0) + v_amount,
           lifetime_earned  = COALESCE(lifetime_earned, 0) + v_amount
     WHERE id = v_promoter_wallet_id;

    -- Audit trail — never-throw by design in log_money_event; the extra
    -- exception guard means even a missing/renamed logger cannot roll back a
    -- completed settlement.
    BEGIN
      PERFORM public.log_money_event(
        _source            => 'promoter-settlement',
        _event_type        => 'payout',
        _user_id           => r.promoter_user_id,
        _creator_id        => v_creator_id,
        _amount_cents      => v_owed_cents,
        _reference_id      => v_settlement_id,
        _metadata          => jsonb_build_object(
          'event_id', p_event_id,
          'promoter_id', r.id,
          'commission_pct', r.commission_pct,
          'sales_count', v_sales_count,
          'earned_cents', v_earned_cents));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'settle_event_promoters: log_money_event failed: %', SQLERRM;
    END;

    v_results := v_results || jsonb_build_object(
      'promoter_id', r.id,
      'owed_cents', v_owed_cents,
      'settled_cents', v_owed_cents,
      'already_settled_cents', v_settled_cents,
      'status', 'settled');
  END LOOP;

  RETURN v_results;
END;
$$;

-- Callable by signed-in users (the creator guard is enforced inside) and the
-- service role; never by anon.
REVOKE ALL ON FUNCTION public.settle_event_promoters(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_event_promoters(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_event_promoters(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_event_promoters(uuid) TO service_role;
