UPDATE public.mux_live_streams
SET status = 'idle', ended_at = COALESCE(ended_at, updated_at, now())
WHERE status = 'active'
  AND ended_at IS NULL
  AND updated_at < now() - interval '30 minutes';