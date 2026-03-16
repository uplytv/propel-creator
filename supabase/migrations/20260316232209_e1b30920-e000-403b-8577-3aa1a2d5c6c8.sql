
-- Fix: Allow anyone (authenticated or anon) to SELECT public streams
DROP POLICY IF EXISTS "Public streams visible to all" ON public.mux_live_streams;

CREATE POLICY "Public streams visible to all"
ON public.mux_live_streams
FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

-- Clean up stale active streams (older than 6 hours)
UPDATE public.mux_live_streams
SET status = 'idle', ended_at = now()
WHERE status = 'active' AND started_at < now() - interval '6 hours';
