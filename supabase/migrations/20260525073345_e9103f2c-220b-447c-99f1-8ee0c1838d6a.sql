CREATE TABLE IF NOT EXISTS public.stream_live_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL UNIQUE,
  creator_id uuid NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_live_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can view their own stream notification logs"
  ON public.stream_live_notifications FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_stream_live_notifications_creator
  ON public.stream_live_notifications(creator_id);