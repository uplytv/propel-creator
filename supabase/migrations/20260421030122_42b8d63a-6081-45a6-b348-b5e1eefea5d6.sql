-- ============================================================
-- UPLY EVENTS + TICKETS + LIVE COMMERCE — Foundation Migration
-- ============================================================

-- ---------- 1. EXTEND events ----------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS co_host_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS geohash text,
  ADD COLUMN IF NOT EXISTS doors_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS lineup jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS ticket_sales_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS ticket_sales_close_at timestamptz,
  ADD COLUMN IF NOT EXISTS resale_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS resale_price_cap_pct int DEFAULT 120,
  ADD COLUMN IF NOT EXISTS live_stream_id uuid,
  ADD COLUMN IF NOT EXISTS associated_video_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_visibility_check') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_visibility_check
      CHECK (visibility IN ('public','unlisted','private','members_only'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_starts_at_pub ON public.events(starts_at) WHERE status='published' AND visibility='public';
CREATE INDEX IF NOT EXISTS idx_events_geohash ON public.events(geohash, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_tags ON public.events USING gin(tags);

-- ---------- 2. ticket_tiers ----------
CREATE TABLE IF NOT EXISTS public.ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  quantity_total int NOT NULL,
  quantity_sold int NOT NULL DEFAULT 0,
  quantity_reserved int NOT NULL DEFAULT 0,
  per_user_limit int DEFAULT 8,
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  is_hidden boolean NOT NULL DEFAULT false,
  sort_order int DEFAULT 0,
  perks jsonb DEFAULT '[]'::jsonb,
  pricing_mode text DEFAULT 'fixed' CHECK (pricing_mode IN ('fixed','dynamic')),
  min_price_cents int,
  max_price_cents int,
  squad_min_size int,
  member_only_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event ON public.ticket_tiers(event_id, sort_order);
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

-- ---------- 3. orders (unified ledger) ----------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  order_type text NOT NULL CHECK (order_type IN ('primary_ticket','resale_ticket','merch','tip','subscription','gig','live_stream_purchase','season_pass')),
  subtotal_cents int NOT NULL,
  fees_cents int NOT NULL DEFAULT 0,
  taxes_cents int NOT NULL DEFAULT 0,
  total_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  storekit_transaction_id text,
  payment_provider text DEFAULT 'stripe' CHECK (payment_provider IN ('stripe','storekit','wallet')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','refunded','disputed')),
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_event ON public.orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_pi ON public.orders(stripe_payment_intent_id);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ---------- 4. EXTEND tickets ----------
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS tier_id uuid REFERENCES public.ticket_tiers(id),
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS original_purchaser_id uuid,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS purchase_price_cents int,
  ADD COLUMN IF NOT EXISTS current_price_cents int,
  ADD COLUMN IF NOT EXISTS qr_code_secret text UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS scanned_by uuid,
  ADD COLUMN IF NOT EXISTS transferred_from uuid,
  ADD COLUMN IF NOT EXISTS transfer_count int NOT NULL DEFAULT 0;

-- Backfill owner_id from buyer_id for legacy rows
UPDATE public.tickets SET owner_id = buyer_id WHERE owner_id IS NULL;
UPDATE public.tickets SET original_purchaser_id = buyer_id WHERE original_purchaser_id IS NULL;
UPDATE public.tickets SET purchase_price_cents = COALESCE((amount_paid * 100)::int, 0) WHERE purchase_price_cents IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_owner ON public.tickets(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_event_status ON public.tickets(event_id, status);

-- ---------- 5. ticket_listings (resale) ----------
CREATE TABLE IF NOT EXISTS public.ticket_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  asking_price_cents int NOT NULL,
  listing_type text NOT NULL DEFAULT 'fixed' CHECK (listing_type IN ('fixed','auction','make_offer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sold_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_listings_event ON public.ticket_listings(event_id, status);
ALTER TABLE public.ticket_listings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ticket_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.ticket_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  offer_price_cents int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired','withdrawn')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_offers ENABLE ROW LEVEL SECURITY;

-- ---------- 6. event_chat_messages ----------
CREATE TABLE IF NOT EXISTS public.event_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text,
  media_url text,
  reply_to uuid REFERENCES public.event_chat_messages(id),
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_chat_event ON public.event_chat_messages(event_id, created_at DESC);
ALTER TABLE public.event_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_chat_messages;

-- ---------- 7. live_commerce_items ----------
CREATE TABLE IF NOT EXISTS public.live_commerce_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id uuid,
  creator_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('ticket_tier','merch','digital_product','tip_preset','gig')),
  ref_id uuid,
  title text NOT NULL,
  image_url text,
  price_cents int NOT NULL,
  inventory int,
  pin_to_stream boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_commerce_stream ON public.live_commerce_items(live_stream_id, sort_order);
ALTER TABLE public.live_commerce_items ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_commerce_items;

-- ---------- 8. tips ----------
CREATE TABLE IF NOT EXISTS public.tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  amount_cents int NOT NULL,
  context_type text CHECK (context_type IN ('live_stream','video','event','profile','chat')),
  context_id uuid,
  message text,
  order_id uuid REFERENCES public.orders(id),
  payment_provider text DEFAULT 'stripe' CHECK (payment_provider IN ('stripe','storekit')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tips_to ON public.tips(to_user_id, created_at DESC);
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- ---------- 9. gigs ----------
CREATE TABLE IF NOT EXISTS public.gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  cover_image_url text,
  packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_days int,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  rating_avg numeric(3,2),
  rating_count int DEFAULT 0,
  orders_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;

-- ---------- 10. marketplace_listings ----------
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('merch','digital','physical','wanted')),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  images text[] DEFAULT '{}',
  price_cents int,
  currency text DEFAULT 'USD',
  geohash text,
  lat numeric,
  lng numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_event ON public.marketplace_listings(event_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_geohash ON public.marketplace_listings(geohash);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- ---------- 11. friend_connections ----------
CREATE TABLE IF NOT EXISTS public.friend_connections (
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  initiated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  PRIMARY KEY (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friend_connections(friend_id, status);
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

-- ---------- 12. contact_sync ----------
CREATE TABLE IF NOT EXISTS public.contact_sync (
  user_id uuid NOT NULL,
  phone_hash text NOT NULL,
  matched_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, phone_hash)
);
CREATE INDEX IF NOT EXISTS idx_contact_sync_hash ON public.contact_sync(phone_hash);
ALTER TABLE public.contact_sync ENABLE ROW LEVEL SECURITY;

-- ---------- 13. Smart add-on tables ----------
CREATE TABLE IF NOT EXISTS public.vouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, voucher_id)
);
CREATE INDEX IF NOT EXISTS idx_vouches_event ON public.vouches(event_id);
ALTER TABLE public.vouches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.split_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE CASCADE,
  total_cents int NOT NULL,
  participant_count int NOT NULL,
  per_person_cents int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired','cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.split_payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.split_payment_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_payment_id uuid NOT NULL REFERENCES public.split_payments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  order_id uuid REFERENCES public.orders(id),
  UNIQUE(split_payment_id, user_id)
);
ALTER TABLE public.split_payment_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.season_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_image_url text,
  price_cents int NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.season_passes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.season_pass_events (
  season_pass_id uuid NOT NULL REFERENCES public.season_passes(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES public.ticket_tiers(id),
  PRIMARY KEY (season_pass_id, event_id)
);
ALTER TABLE public.season_pass_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.event_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  reward_cents int NOT NULL DEFAULT 0,
  paid boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_referrals_referrer ON public.event_referrals(referrer_id);
ALTER TABLE public.event_referrals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  max_bid_cents int,
  created_at timestamptz NOT NULL DEFAULT now(),
  matched_at timestamptz,
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.live_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('event_countdown','live_stream','order_status')),
  reference_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status text DEFAULT 'active'
);
ALTER TABLE public.live_activities ENABLE ROW LEVEL SECURITY;

-- ---------- 14. Reliability infrastructure ----------
CREATE TABLE IF NOT EXISTS public.error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text,
  user_id uuid,
  function_name text NOT NULL,
  error_message text,
  stack text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_error_log_recent ON public.error_log(created_at DESC);
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  rollout_percentage int DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('events_resale', true, 'Allow ticket resale marketplace'),
  ('events_split_pay', true, 'Allow split payments for tickets'),
  ('events_squad_tickets', true, 'Allow squad-priced ticket tiers'),
  ('events_adaptive_pricing', true, 'Allow dynamic pricing on tiers'),
  ('events_ar_preview', true, 'Show AR venue preview'),
  ('events_waitlist_auctions', true, 'Allow bidding on sold-out events'),
  ('events_season_pass', true, 'Allow multi-event season passes'),
  ('events_referral_revenue', true, 'Pay 1% referral on event tickets'),
  ('events_fan_drops', true, 'Allow members-only ticket pre-sale'),
  ('apple_wallet', false, 'Generate .pkpass passes — requires certs'),
  ('google_wallet', false, 'Generate Google Wallet passes — requires service account'),
  ('storekit_tips', false, 'Route iOS tips through StoreKit (App Store ready)')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy','degraded','down')),
  latency_ms int,
  error_message text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_recent ON public.health_checks(service, checked_at DESC);
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

-- ---------- 15. Atomic inventory reservation function ----------
CREATE OR REPLACE FUNCTION public.reserve_ticket_inventory(p_tier_id uuid, p_quantity int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.ticket_tiers
  SET quantity_reserved = quantity_reserved + p_quantity
  WHERE id = p_tier_id
    AND quantity_sold + quantity_reserved + p_quantity <= quantity_total;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ticket_inventory(p_tier_id uuid, p_quantity int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ticket_tiers
  SET quantity_reserved = GREATEST(0, quantity_reserved - p_quantity)
  WHERE id = p_tier_id;
$$;

CREATE OR REPLACE FUNCTION public.confirm_ticket_inventory(p_tier_id uuid, p_quantity int)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ticket_tiers
  SET quantity_reserved = GREATEST(0, quantity_reserved - p_quantity),
      quantity_sold = quantity_sold + p_quantity
  WHERE id = p_tier_id;
$$;

CREATE OR REPLACE FUNCTION public.rotate_ticket_qr(p_ticket_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_secret text;
BEGIN
  v_new_secret := encode(gen_random_bytes(32), 'hex');
  UPDATE public.tickets SET qr_code_secret = v_new_secret WHERE id = p_ticket_id;
  RETURN v_new_secret;
END;
$$;

-- ---------- 16. RLS POLICIES ----------

-- ticket_tiers
DROP POLICY IF EXISTS "ticket_tiers public read" ON public.ticket_tiers;
CREATE POLICY "ticket_tiers public read" ON public.ticket_tiers FOR SELECT USING (
  is_hidden = false AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.visibility IN ('public','unlisted'))
);
DROP POLICY IF EXISTS "ticket_tiers creator manage" ON public.ticket_tiers;
CREATE POLICY "ticket_tiers creator manage" ON public.ticket_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.creator_id = auth.uid() OR auth.uid() = ANY(e.co_host_ids)))
) WITH CHECK (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.creator_id = auth.uid() OR auth.uid() = ANY(e.co_host_ids)))
);

-- orders (private to buyer + service role)
DROP POLICY IF EXISTS "orders own read" ON public.orders;
CREATE POLICY "orders own read" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "orders own insert" ON public.orders;
CREATE POLICY "orders own insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- ticket_listings
DROP POLICY IF EXISTS "listings public read" ON public.ticket_listings;
CREATE POLICY "listings public read" ON public.ticket_listings FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "listings seller manage" ON public.ticket_listings;
CREATE POLICY "listings seller manage" ON public.ticket_listings FOR ALL USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

-- ticket_offers
DROP POLICY IF EXISTS "offers buyer manage" ON public.ticket_offers;
CREATE POLICY "offers buyer manage" ON public.ticket_offers FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "offers seller view" ON public.ticket_offers;
CREATE POLICY "offers seller view" ON public.ticket_offers FOR SELECT USING (
  EXISTS (SELECT 1 FROM ticket_listings tl WHERE tl.id = listing_id AND tl.seller_id = auth.uid())
);

-- event_chat_messages
DROP POLICY IF EXISTS "event_chat read" ON public.event_chat_messages;
CREATE POLICY "event_chat read" ON public.event_chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.visibility IN ('public','unlisted'))
);
DROP POLICY IF EXISTS "event_chat post" ON public.event_chat_messages;
CREATE POLICY "event_chat post" ON public.event_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "event_chat delete own" ON public.event_chat_messages;
CREATE POLICY "event_chat delete own" ON public.event_chat_messages FOR DELETE USING (auth.uid() = user_id);

-- live_commerce_items
DROP POLICY IF EXISTS "live_commerce public read" ON public.live_commerce_items;
CREATE POLICY "live_commerce public read" ON public.live_commerce_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "live_commerce creator manage" ON public.live_commerce_items;
CREATE POLICY "live_commerce creator manage" ON public.live_commerce_items FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- tips
DROP POLICY IF EXISTS "tips view own" ON public.tips;
CREATE POLICY "tips view own" ON public.tips FOR SELECT USING (auth.uid() IN (from_user_id, to_user_id));
DROP POLICY IF EXISTS "tips insert own" ON public.tips;
CREATE POLICY "tips insert own" ON public.tips FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- gigs
DROP POLICY IF EXISTS "gigs public read" ON public.gigs;
CREATE POLICY "gigs public read" ON public.gigs FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "gigs creator manage" ON public.gigs;
CREATE POLICY "gigs creator manage" ON public.gigs FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- marketplace_listings
DROP POLICY IF EXISTS "marketplace public read" ON public.marketplace_listings;
CREATE POLICY "marketplace public read" ON public.marketplace_listings FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "marketplace seller manage" ON public.marketplace_listings;
CREATE POLICY "marketplace seller manage" ON public.marketplace_listings FOR ALL USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

-- friend_connections
DROP POLICY IF EXISTS "friends view own" ON public.friend_connections;
CREATE POLICY "friends view own" ON public.friend_connections FOR SELECT USING (auth.uid() IN (user_id, friend_id));
DROP POLICY IF EXISTS "friends insert" ON public.friend_connections;
CREATE POLICY "friends insert" ON public.friend_connections FOR INSERT WITH CHECK (auth.uid() = initiated_by);
DROP POLICY IF EXISTS "friends update" ON public.friend_connections;
CREATE POLICY "friends update" ON public.friend_connections FOR UPDATE USING (auth.uid() IN (user_id, friend_id));
DROP POLICY IF EXISTS "friends delete" ON public.friend_connections;
CREATE POLICY "friends delete" ON public.friend_connections FOR DELETE USING (auth.uid() IN (user_id, friend_id));

-- contact_sync (private to user)
DROP POLICY IF EXISTS "contact_sync own" ON public.contact_sync;
CREATE POLICY "contact_sync own" ON public.contact_sync FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- vouches
DROP POLICY IF EXISTS "vouches public read" ON public.vouches;
CREATE POLICY "vouches public read" ON public.vouches FOR SELECT USING (true);
DROP POLICY IF EXISTS "vouches own manage" ON public.vouches;
CREATE POLICY "vouches own manage" ON public.vouches FOR ALL USING (auth.uid() = voucher_id) WITH CHECK (auth.uid() = voucher_id);

-- split_payments
DROP POLICY IF EXISTS "split_pay own" ON public.split_payments;
CREATE POLICY "split_pay own" ON public.split_payments FOR ALL USING (
  auth.uid() = initiator_id OR EXISTS (SELECT 1 FROM split_payment_participants p WHERE p.split_payment_id = id AND p.user_id = auth.uid())
);
DROP POLICY IF EXISTS "split_pay insert" ON public.split_payments;
CREATE POLICY "split_pay insert" ON public.split_payments FOR INSERT WITH CHECK (auth.uid() = initiator_id);

DROP POLICY IF EXISTS "split_participants view" ON public.split_payment_participants;
CREATE POLICY "split_participants view" ON public.split_payment_participants FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM split_payments sp WHERE sp.id = split_payment_id AND sp.initiator_id = auth.uid())
);
DROP POLICY IF EXISTS "split_participants update" ON public.split_payment_participants;
CREATE POLICY "split_participants update" ON public.split_payment_participants FOR UPDATE USING (auth.uid() = user_id);

-- season_passes
DROP POLICY IF EXISTS "season_pass public" ON public.season_passes;
CREATE POLICY "season_pass public" ON public.season_passes FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "season_pass creator" ON public.season_passes;
CREATE POLICY "season_pass creator" ON public.season_passes FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "season_pass_events public" ON public.season_pass_events;
CREATE POLICY "season_pass_events public" ON public.season_pass_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "season_pass_events creator" ON public.season_pass_events;
CREATE POLICY "season_pass_events creator" ON public.season_pass_events FOR ALL USING (
  EXISTS (SELECT 1 FROM season_passes sp WHERE sp.id = season_pass_id AND sp.creator_id = auth.uid())
);

-- event_referrals (private to referrer + buyer)
DROP POLICY IF EXISTS "event_referrals own" ON public.event_referrals;
CREATE POLICY "event_referrals own" ON public.event_referrals FOR SELECT USING (auth.uid() IN (referrer_id, buyer_id));

-- event_waitlist
DROP POLICY IF EXISTS "waitlist own" ON public.event_waitlist;
CREATE POLICY "waitlist own" ON public.event_waitlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- live_activities
DROP POLICY IF EXISTS "live_activities own" ON public.live_activities;
CREATE POLICY "live_activities own" ON public.live_activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- error_log (admin only read; service role write)
DROP POLICY IF EXISTS "error_log admin read" ON public.error_log;
CREATE POLICY "error_log admin read" ON public.error_log FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- feature_flags (public read; admin write)
DROP POLICY IF EXISTS "flags public read" ON public.feature_flags;
CREATE POLICY "flags public read" ON public.feature_flags FOR SELECT USING (true);
DROP POLICY IF EXISTS "flags admin write" ON public.feature_flags;
CREATE POLICY "flags admin write" ON public.feature_flags FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- health_checks (public read for status page)
DROP POLICY IF EXISTS "health public read" ON public.health_checks;
CREATE POLICY "health public read" ON public.health_checks FOR SELECT USING (true);

-- ---------- 17. updated_at trigger on events ----------
DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();