-- Pending: database access was unavailable. Apply with the migration tool.
CREATE TABLE IF NOT EXISTS public.oauth_states (
  nonce uuid PRIMARY KEY, user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), used boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.oauth_states TO service_role;
REVOKE ALL ON public.oauth_states FROM PUBLIC, anon, authenticated;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages OAuth states" ON public.oauth_states
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_meta_oauth_state(p_nonce uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  UPDATE public.oauth_states SET used = true
  WHERE nonce = p_nonce AND used = false
    AND created_at > now() - interval '10 minutes' AND created_at <= now()
  RETURNING user_id INTO v_user_id;
  RETURN v_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_meta_oauth_state(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_meta_oauth_state(uuid) TO service_role;

-- Lock the order and wallet; balance and ledger commit together exactly once.
-- Integer-cent arithmetic converts only at legacy decimal-dollar storage boundaries.
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_order_id uuid, p_amount_cents bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE; v_wallet_id uuid; v_seller_id uuid;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.order_type <> 'resale_ticket'
    OR v_order.status NOT IN ('processing', 'completed')
    OR p_amount_cents IS NULL OR p_amount_cents <= 0
    OR p_amount_cents <> v_order.subtotal_cents THEN
    RAISE EXCEPTION 'Invalid resale wallet credit';
  END IF;
  v_seller_id := (v_order.metadata->>'seller_id')::uuid;
  IF v_seller_id IS NULL THEN RAISE EXCEPTION 'Missing seller'; END IF;
  INSERT INTO public.wallets(user_id) VALUES(v_seller_id) ON CONFLICT(user_id) DO NOTHING;
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_seller_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.transactions WHERE wallet_id = v_wallet_id
    AND reference_id = p_order_id AND status = 'completed') THEN
    RETURN v_wallet_id;
  END IF;
  UPDATE public.wallets SET available_balance =
    (round(coalesce(available_balance, 0) * 100)::bigint + p_amount_cents)::numeric / 100
    WHERE id = v_wallet_id;
  INSERT INTO public.transactions(wallet_id, amount, status, reference_id, net_amount)
    VALUES(v_wallet_id, p_amount_cents::numeric / 100, 'completed', p_order_id, p_amount_cents::numeric / 100);
  RETURN v_wallet_id;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_wallet_balance(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, bigint) TO service_role;