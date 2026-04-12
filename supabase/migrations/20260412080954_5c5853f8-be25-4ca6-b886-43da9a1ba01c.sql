-- 1. Enable RLS on edge_function_rate_limits
ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages rate limits"
  ON public.edge_function_rate_limits FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 2. Add policies to auth_rate_limits (RLS enabled, no policies)
CREATE POLICY "Service role manages auth rate limits"
  ON public.auth_rate_limits FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 3. Add policies to webhook_errors (RLS enabled, no policies)
CREATE POLICY "Service role manages webhook errors"
  ON public.webhook_errors FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 4. Tighten shorts_queue INSERT — service_role only
DROP POLICY IF EXISTS "Service can insert shorts queue" ON public.shorts_queue;
CREATE POLICY "Service role can insert shorts queue"
  ON public.shorts_queue FOR INSERT
  TO service_role WITH CHECK (true);

-- 5. Tighten stream_transcripts INSERT — service_role only
DROP POLICY IF EXISTS "Service can insert transcripts" ON public.stream_transcripts;
CREATE POLICY "Service role can insert transcripts"
  ON public.stream_transcripts FOR INSERT
  TO service_role WITH CHECK (true);