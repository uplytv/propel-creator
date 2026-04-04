
-- 1. Add vault secret ID column to creator_stream_destinations
ALTER TABLE public.creator_stream_destinations 
  ADD COLUMN IF NOT EXISTS stream_key_vault_id uuid;

-- 2. Create multistream_alerts table
CREATE TABLE IF NOT EXISTS public.multistream_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid,
  platform text,
  alert_type text CHECK (alert_type IN ('token_expired', 'refresh_failed', 'stream_dropped', 'connection_lost')),
  message text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.multistream_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own alerts"
  ON public.multistream_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.multistream_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.multistream_alerts;

-- 3. Create edge function rate limits table
CREATE TABLE IF NOT EXISTS public.edge_function_rate_limits (
  key text PRIMARY KEY,
  call_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.edge_function_rate_limits(window_start);
