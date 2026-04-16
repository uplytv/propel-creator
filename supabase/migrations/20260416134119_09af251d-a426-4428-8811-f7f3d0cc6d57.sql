-- Subscribers table for email capture
CREATE TABLE public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  metadata JSONB DEFAULT '{}',
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  total_purchases INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(creator_id, email)
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own subscribers"
ON public.subscribers FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Creators can update their own subscribers"
ON public.subscribers FOR UPDATE
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Anyone authenticated can insert subscribers"
ON public.subscribers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can insert subscribers anonymously"
ON public.subscribers FOR INSERT
TO anon
WITH CHECK (true);

CREATE INDEX idx_subscribers_creator ON public.subscribers(creator_id);
CREATE INDEX idx_subscribers_email ON public.subscribers(email);
CREATE INDEX idx_subscribers_source ON public.subscribers(source);

-- Event RSVPs table
CREATE TABLE public.event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  user_id UUID,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  confirmation_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can RSVP to events"
ON public.event_rsvps FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Event creators can view RSVPs"
ON public.event_rsvps FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own RSVPs"
ON public.event_rsvps FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_event_rsvps_event ON public.event_rsvps(event_id);

-- Email broadcasts table
CREATE TABLE public.email_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_recipients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage their own broadcasts"
ON public.email_broadcasts FOR ALL
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

CREATE INDEX idx_email_broadcasts_creator ON public.email_broadcasts(creator_id);

-- Enable realtime for subscribers
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscribers;