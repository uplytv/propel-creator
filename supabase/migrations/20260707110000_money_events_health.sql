-- ============================================================================
-- money_events audit trail + health-check helpers
-- Phase 2 (money trail reconstruction) + Phase 4 (launch-day monitoring).
--
-- Additive only. No existing table, policy, or function is modified.
--
-- Design:
--   * money_events is an append-only audit ledger written EXCLUSIVELY by the
--     service role (edge functions) via public.log_money_event(). There are
--     deliberately NO client INSERT/UPDATE/DELETE policies — RLS default-deny
--     blocks all client writes, and table privileges are revoked as a second
--     belt. SELECT is admin-only via the canonical
--     public.has_role(auth.uid(), 'admin') check (signature:
--     has_role(_user_id uuid, _role app_role) — defined in 20260309000555).
--   * log_money_event() is SECURITY DEFINER with never-throw semantics
--     (EXCEPTION -> RAISE WARNING, returns NULL) so audit logging can NEVER
--     break a money path. Money functions call it fire-and-forget.
--   * No FK constraints on user_id / creator_id / reference_id: an audit row
--     must survive even if the referenced row is deleted later, and an insert
--     must never fail because a referenced row is missing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.money_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  -- Which code path wrote the row, e.g. 'stripe-webhook', 'finalize-cart-order',
  -- 'finalize-ticket-order', 'stripe-refund-ticket', 'cancel-event',
  -- 'platform-dunning-check'.
  source            text NOT NULL,
  -- What money movement happened, e.g. 'wallet_credit', 'refund', 'dispute',
  -- 'payout', 'ticket_issue', 'sold_out_refund'.
  event_type        text NOT NULL,
  stripe_event_id   text,
  payment_intent_id text,
  user_id           uuid,
  creator_id        uuid,
  amount_cents      bigint,
  fee_cents         bigint,
  currency          text DEFAULT 'usd',
  -- Domain object the event refers to (order id, ticket id, event id, ...).
  reference_id      uuid,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.money_events IS
  'Append-only money-trail audit ledger. Service-role writes only (via log_money_event); admin-only reads. Sufficient to reconstruct the money trail per payment_intent / creator / Stripe event.';

CREATE INDEX IF NOT EXISTS idx_money_events_payment_intent
  ON public.money_events (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_money_events_creator_occurred
  ON public.money_events (creator_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_money_events_stripe_event
  ON public.money_events (stripe_event_id);

-- ---------------------------------------------------------------------------
-- 2. RLS — admin SELECT only; zero client write paths
-- ---------------------------------------------------------------------------
ALTER TABLE public.money_events ENABLE ROW LEVEL SECURITY;

-- No INSERT / UPDATE / DELETE policies on purpose: with RLS enabled and no
-- policy, anon/authenticated writes are denied. The service role bypasses RLS.
CREATE POLICY "money_events admin read"
  ON public.money_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Belt and braces: strip the default table grants Supabase gives client roles
-- so even a future misconfigured policy cannot open a write path.
REVOKE INSERT, UPDATE, DELETE ON public.money_events FROM anon, authenticated;
REVOKE ALL ON public.money_events FROM public;

-- ---------------------------------------------------------------------------
-- 3. log_money_event() — never-throw SECURITY DEFINER writer
-- ---------------------------------------------------------------------------
-- Called by edge functions (service role) fire-and-forget:
--   await supabase.rpc('log_money_event', { _source: '...', _event_type: '...', ... });
-- Returns the new row id, or NULL if the insert failed (warning raised,
-- caller unaffected). Logging must never break a money path.
CREATE OR REPLACE FUNCTION public.log_money_event(
  _source            text,
  _event_type        text,
  _stripe_event_id   text    DEFAULT NULL,
  _payment_intent_id text    DEFAULT NULL,
  _user_id           uuid    DEFAULT NULL,
  _creator_id        uuid    DEFAULT NULL,
  _amount_cents      bigint  DEFAULT NULL,
  _fee_cents         bigint  DEFAULT NULL,
  _currency          text    DEFAULT 'usd',
  _reference_id      uuid    DEFAULT NULL,
  _metadata          jsonb   DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.money_events (
    source, event_type, stripe_event_id, payment_intent_id,
    user_id, creator_id, amount_cents, fee_cents, currency,
    reference_id, metadata
  ) VALUES (
    _source, _event_type, _stripe_event_id, _payment_intent_id,
    _user_id, _creator_id, _amount_cents, _fee_cents,
    COALESCE(_currency, 'usd'), _reference_id, COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _id;
  RETURN _id;
EXCEPTION WHEN OTHERS THEN
  -- Never-throw: audit logging must never break the calling money path.
  RAISE WARNING 'log_money_event failed (source=%, event_type=%): %',
    _source, _event_type, SQLERRM;
  RETURN NULL;
END;
$$;

-- Service-role / edge-function callable only.
REVOKE ALL ON FUNCTION public.log_money_event(text, text, text, text, uuid, uuid, bigint, bigint, text, uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_money_event(text, text, text, text, uuid, uuid, bigint, bigint, text, uuid, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Health-check helpers (used by the health-check edge function)
-- ---------------------------------------------------------------------------
-- Trivial DB reachability probe ("select 1" behind an RPC so the edge
-- function's service client can call it through PostgREST).
CREATE OR REPLACE FUNCTION public.health_ping()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT 1 $$;

REVOKE ALL ON FUNCTION public.health_ping() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.health_ping() TO service_role;

-- Cheap combined email-queue depth (pgmq.metrics is O(1) — it reads table
-- stats, not rows). Never-throw: returns whatever it could read and warns on
-- the rest, so a dropped queue cannot fail the health endpoint.
CREATE OR REPLACE FUNCTION public.email_queue_depth()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total bigint := 0;
  _q text;
BEGIN
  FOREACH _q IN ARRAY ARRAY['auth_emails', 'transactional_emails'] LOOP
    BEGIN
      _total := _total + COALESCE((SELECT queue_length FROM pgmq.metrics(_q)), 0);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'email_queue_depth: could not read queue %: %', _q, SQLERRM;
    END;
  END LOOP;
  RETURN _total;
END;
$$;

REVOKE ALL ON FUNCTION public.email_queue_depth() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_depth() TO service_role;
