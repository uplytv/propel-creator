-- 1. Add geo + affiliate columns
ALTER TABLE public.events_global
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS affiliate_url text;

CREATE INDEX IF NOT EXISTS idx_events_global_geo
  ON public.events_global (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2. RSVPs ("I'm Going")
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events_global(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON public.event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON public.event_rsvps (user_id);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RSVPs are viewable by everyone"
  ON public.event_rsvps FOR SELECT USING (true);

CREATE POLICY "Users can create their own RSVP"
  ON public.event_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVP"
  ON public.event_rsvps FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RSVP"
  ON public.event_rsvps FOR DELETE USING (auth.uid() = user_id);

-- 3. Make sure cron + net are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;