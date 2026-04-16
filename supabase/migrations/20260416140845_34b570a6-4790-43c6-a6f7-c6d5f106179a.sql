-- Add tracking, scheduling, and A/B testing columns to email_broadcasts
ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS open_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ab_variant_a text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ab_variant_b text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ab_test_size integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ab_winner text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ab_parent_id uuid DEFAULT NULL;

-- Add tags to subscribers
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create index for tag-based queries
CREATE INDEX IF NOT EXISTS idx_subscribers_tags ON public.subscribers USING GIN(tags);

-- Create tracking events table
CREATE TABLE IF NOT EXISTS public.broadcast_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.email_broadcasts(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  event_type text NOT NULL DEFAULT 'open',
  link_url text DEFAULT NULL,
  user_agent text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_broadcast ON public.broadcast_tracking_events(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_tracking_type ON public.broadcast_tracking_events(event_type);

ALTER TABLE public.broadcast_tracking_events ENABLE ROW LEVEL SECURITY;

-- Creators can view tracking for their own broadcasts
CREATE POLICY "Creators view own tracking" ON public.broadcast_tracking_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.email_broadcasts eb
      WHERE eb.id = broadcast_tracking_events.broadcast_id
      AND eb.creator_id = auth.uid()
    )
  );

-- Service role inserts tracking (from edge function)
CREATE POLICY "Service inserts tracking" ON public.broadcast_tracking_events
  FOR INSERT WITH CHECK (true);