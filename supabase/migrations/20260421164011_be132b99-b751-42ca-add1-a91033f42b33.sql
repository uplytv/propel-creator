CREATE TABLE public.boost_toast_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL CHECK (event_name IN ('boost_toast_shown', 'boost_toast_action_clicked', 'boost_toast_dismissed')),
  boost_state TEXT NOT NULL CHECK (boost_state IN ('ending', 'ended')),
  boost_key TEXT NOT NULL,
  route TEXT,
  content_type TEXT,
  content_id TEXT,
  creator_id UUID,
  via TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_boost_toast_events_created_at ON public.boost_toast_events (created_at DESC);
CREATE INDEX idx_boost_toast_events_event_state ON public.boost_toast_events (event_name, boost_state, created_at DESC);
CREATE INDEX idx_boost_toast_events_route ON public.boost_toast_events (route);

ALTER TABLE public.boost_toast_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert boost toast events"
ON public.boost_toast_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read boost toast events"
ON public.boost_toast_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));