
-- Live Products (items for sale during streams)
CREATE TABLE public.live_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES public.mux_live_streams(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity_total INTEGER NOT NULL DEFAULT 1,
  quantity_remaining INTEGER NOT NULL DEFAULT 1,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_sold_out BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL DEFAULT 'sell',
  auction_duration_minutes INTEGER DEFAULT 5,
  starting_bid NUMERIC DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view live products" ON public.live_products FOR SELECT USING (true);
CREATE POLICY "Creator can manage own live products" ON public.live_products FOR ALL USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- Live Purchases
CREATE TABLE public.live_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_product_id UUID REFERENCES public.live_products(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  stripe_payment_intent_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  creator_earnings NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchases" ON public.live_purchases FOR SELECT USING (buyer_id = auth.uid() OR creator_id = auth.uid());
CREATE POLICY "Authenticated can insert purchases" ON public.live_purchases FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

-- Live Bids
CREATE TABLE public.live_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_product_id UUID REFERENCES public.live_products(id) ON DELETE CASCADE NOT NULL,
  bidder_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  is_winning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view bids" ON public.live_bids FOR SELECT USING (true);
CREATE POLICY "Authenticated can bid" ON public.live_bids FOR INSERT TO authenticated WITH CHECK (bidder_id = auth.uid());

-- Live Auctions
CREATE TABLE public.live_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_product_id UUID REFERENCES public.live_products(id) ON DELETE CASCADE NOT NULL,
  stream_id UUID REFERENCES public.mux_live_streams(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID NOT NULL,
  starting_bid NUMERIC NOT NULL DEFAULT 0,
  current_bid NUMERIC NOT NULL DEFAULT 0,
  current_winner_id UUID,
  current_winner_username TEXT,
  bid_count INTEGER NOT NULL DEFAULT 0,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view auctions" ON public.live_auctions FOR SELECT USING (true);
CREATE POLICY "Creator can manage auctions" ON public.live_auctions FOR ALL USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- Live Giveaways
CREATE TABLE public.live_giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES public.mux_live_streams(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  entry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  winner_id UUID,
  winner_username TEXT,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_giveaways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view giveaways" ON public.live_giveaways FOR SELECT USING (true);
CREATE POLICY "Creator can manage giveaways" ON public.live_giveaways FOR ALL USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- Live Giveaway Entries
CREATE TABLE public.live_giveaway_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id UUID REFERENCES public.live_giveaways(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(giveaway_id, user_id)
);

ALTER TABLE public.live_giveaway_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view entries" ON public.live_giveaway_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated can enter giveaway" ON public.live_giveaway_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Enable realtime for all live shopping tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_giveaways;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_giveaway_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_purchases;
