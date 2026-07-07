-- Event Promoter Kit (Posh.vip wedge) — ATTRIBUTION + LEADERBOARD ONLY.
-- ADDITIVE ONLY: two new tables, both with RLS in this same migration.
-- No money movement anywhere: event_promoter_sales is a tracking ledger the
-- creator uses to pay promoters manually. No wallet/payout/fee logic here.

-- ─────────────────────────────────────────────────────────────────────────
-- event_promoters: event-scoped promoter roster. A promoter is either a UPLY
-- user (promoter_user_id) or an email/name-only contact. `code` is the promo
-- code carried on shared links (?promo=CODE), unique per event, stored UPPER.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_promoters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  creator_id        uuid NOT NULL,            -- the event's creator (denormalized)
  promoter_user_id  uuid,                     -- null => email/name-only promoter
  promoter_name     text,
  promoter_email    text,
  code              text NOT NULL
                    CHECK (code = upper(code) AND char_length(code) BETWEEN 3 AND 40),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, code),
  CHECK (promoter_user_id IS NOT NULL OR promoter_name IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_event_promoters_event ON public.event_promoters (event_id);
CREATE INDEX IF NOT EXISTS idx_event_promoters_user  ON public.event_promoters (promoter_user_id)
  WHERE promoter_user_id IS NOT NULL;

ALTER TABLE public.event_promoters ENABLE ROW LEVEL SECURITY;

-- Event creator (or owner/manager staff, via the existing SECURITY DEFINER
-- helper) fully manages the promoter roster.
CREATE POLICY "Event managers manage promoters"
  ON public.event_promoters FOR ALL TO authenticated
  USING (public.can_manage_event(event_id))
  WITH CHECK (public.can_manage_event(event_id));

-- A promoter who is a UPLY user can see their own promoter rows.
CREATE POLICY "Promoters read own promoter rows"
  ON public.event_promoters FOR SELECT TO authenticated
  USING (auth.uid() = promoter_user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- event_promoter_sales: one row per attributed order. Written ONLY by the
-- finalize-ticket-order edge function (service role). UNIQUE(order_id) makes
-- attribution idempotent — an order can never be counted twice, no matter how
-- many times finalize runs. amount_cents is the order subtotal (ex-fees).
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_promoter_sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id    uuid NOT NULL REFERENCES public.event_promoters(id) ON DELETE CASCADE,
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  order_id       uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_cents   integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  tickets_count  integer NOT NULL DEFAULT 0 CHECK (tickets_count >= 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_promoter_sales_promoter ON public.event_promoter_sales (promoter_id);
CREATE INDEX IF NOT EXISTS idx_event_promoter_sales_event    ON public.event_promoter_sales (event_id);

ALTER TABLE public.event_promoter_sales ENABLE ROW LEVEL SECURITY;

-- Event creator/managers read attributed sales for their event; a promoter
-- reads rows attributed to them (their own event_promoters row is visible to
-- them under the policy above, so the EXISTS resolves under RLS).
CREATE POLICY "Managers and promoters read attributed sales"
  ON public.event_promoter_sales FOR SELECT TO authenticated
  USING (
    public.can_manage_event(event_id)
    OR EXISTS (
      SELECT 1 FROM public.event_promoters p
      WHERE p.id = promoter_id AND p.promoter_user_id = auth.uid()
    )
  );
-- (No INSERT/UPDATE/DELETE policies => clients can never write; only the
--  service-role edge function records attribution. Append-only ledger.)
