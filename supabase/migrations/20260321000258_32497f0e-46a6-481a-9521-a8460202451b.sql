UPDATE public.mux_live_streams 
SET status = 'idle', ended_at = now() 
WHERE status = 'active' 
AND started_at < now() - interval '6 hours' 
AND viewer_count = 0;