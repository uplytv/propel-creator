-- =============================================================
-- CREATOR COUPONS (UPLY-level, NOT Stripe promotion codes)
-- =============================================================
-- Why not Stripe promotion codes: checkout sessions are created on the
-- PLATFORM account (destination charges), so a Stripe promotion code would be
-- redeemable account-wide — i.e. on OTHER creators' checkouts. Instead,
-- coupons live in this table, are validated by a SECURITY DEFINER RPC, and
-- stripe-create-product-checkout applies percent_off to the unit_amount
-- (price_data) BEFORE session creation. The 5% application fee is computed
-- from the already-discounted amount, so the 95/5 split applies to what the
-- buyer actually pays — no fee math changes.

CREATE TABLE IF NOT EXISTS public.creator_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  code text NOT NULL CHECK (code = upper(code) AND char_length(code) BETWEEN 3 AND 32),
  percent_off integer NOT NULL CHECK (percent_off >= 5 AND percent_off <= 100),
  -- NULL = valid for all of this creator's products
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redeemed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, code)
);

CREATE INDEX IF NOT EXISTS idx_creator_coupons_creator
  ON public.creator_coupons(creator_id, active, created_at DESC);

ALTER TABLE public.creator_coupons ENABLE ROW LEVEL SECURITY;

-- Creators manage ONLY their own coupons. Deliberately NO public SELECT
-- policy: buyers check codes through validate_coupon() below, so codes
-- cannot be enumerated by other users.
CREATE POLICY "Creators manage own coupons"
ON public.creator_coupons FOR ALL
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- -------------------------------------------------------------
-- validate_coupon: buyer-facing check (and server-side re-check in
-- stripe-create-product-checkout). Returns a row only for a live,
-- in-scope, unexpired, under-cap coupon.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_creator_id uuid,
  p_code text,
  p_product_id uuid DEFAULT NULL
)
RETURNS TABLE (coupon_id uuid, percent_off integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.percent_off
  FROM public.creator_coupons c
  WHERE c.creator_id = p_creator_id
    AND c.code = upper(trim(p_code))
    AND c.active
    AND (c.product_id IS NULL OR c.product_id = p_product_id)
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_redemptions IS NULL OR c.redeemed_count < c.max_redemptions)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(uuid, text, uuid) TO authenticated, service_role;

-- -------------------------------------------------------------
-- consume_coupon: atomic, guarded increment. The WHERE clause makes the
-- redemption cap race-safe — two concurrent checkouts cannot both take the
-- last redemption. Called by stripe-create-product-checkout (service role)
-- right before session creation. Service-role only.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_coupon(p_coupon_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE updated integer;
BEGIN
  UPDATE public.creator_coupons
    SET redeemed_count = redeemed_count + 1
    WHERE id = p_coupon_id
      AND active
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_redemptions IS NULL OR redeemed_count < max_redemptions);
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_coupon(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_coupon(uuid) TO service_role;

-- -------------------------------------------------------------
-- release_coupon_redemption: compensating decrement used when Stripe
-- session creation fails AFTER the redemption was consumed. Service-role only.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_coupon_redemption(p_coupon_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.creator_coupons
    SET redeemed_count = greatest(redeemed_count - 1, 0)
    WHERE id = p_coupon_id;
$$;

REVOKE ALL ON FUNCTION public.release_coupon_redemption(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_coupon_redemption(uuid) TO service_role;

-- =============================================================
-- ORDER BUMP (additive column; covered by the existing products RLS —
-- creators already only update their own rows, and the column is readable
-- wherever the product row is readable)
-- =============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bump_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.products.bump_product_id IS
  'Optional one-click "Add this too" cross-sell shown at checkout. Must be another active product by the same creator (enforced in UI; purchase goes through create-cart-checkout).';
