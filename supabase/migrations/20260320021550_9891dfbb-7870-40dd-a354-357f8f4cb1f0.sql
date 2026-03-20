
-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  space_id UUID REFERENCES public.creator_spaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'virtual',
  location_name TEXT,
  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  cover_image_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  ticket_price NUMERIC NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  ticket_quantity INTEGER,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  is_sold_out BOOLEAN NOT NULL DEFAULT false,
  virtual_link TEXT,
  virtual_link_unlocked_at TIMESTAMPTZ,
  stream_on_uply BOOLEAN NOT NULL DEFAULT false,
  mux_stream_id UUID REFERENCES public.mux_live_streams(id) ON DELETE SET NULL,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  refund_policy TEXT NOT NULL DEFAULT 'no_refunds',
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  creator_earnings NUMERIC NOT NULL DEFAULT 0,
  qr_code_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  qr_code_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event waitlist table
CREATE TABLE public.event_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event reminders table
CREATE TABLE public.event_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Add slug auto-generation trigger for events
CREATE TRIGGER auto_slug_events
  BEFORE INSERT ON public.events
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.auto_generate_slug();

-- RLS Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

-- Events: publicly readable if published
CREATE POLICY "Published events are publicly readable"
  ON public.events FOR SELECT
  USING (status = 'published');

-- Events: creator can see their own (any status)
CREATE POLICY "Creators can see own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Events: creator can insert
CREATE POLICY "Creators can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Events: creator can update own
CREATE POLICY "Creators can update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid());

-- Events: creator can delete own
CREATE POLICY "Creators can delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Tickets: buyer can see their own
CREATE POLICY "Buyers can see own tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Tickets: creator can see tickets for their events
CREATE POLICY "Creators can see event tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Tickets: authenticated users can insert (purchase)
CREATE POLICY "Users can purchase tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- Tickets: buyer can update own (for cancel)
CREATE POLICY "Buyers can update own tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid());

-- Tickets: creator can update (for check-in)
CREATE POLICY "Creators can update tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid());

-- Event waitlist: user can see own
CREATE POLICY "Users can see own waitlist entries"
  ON public.event_waitlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Event waitlist: creator can see for their events
CREATE POLICY "Creators can see event waitlist"
  ON public.event_waitlist FOR SELECT
  TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE creator_id = auth.uid()));

-- Event waitlist: users can join
CREATE POLICY "Users can join waitlist"
  ON public.event_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Event reminders: user can see own
CREATE POLICY "Users can see own reminders"
  ON public.event_reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Event reminders: users can set
CREATE POLICY "Users can set reminders"
  ON public.event_reminders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Event reminders: users can delete own
CREATE POLICY "Users can delete own reminders"
  ON public.event_reminders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for events and tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
