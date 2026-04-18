ALTER PUBLICATION supabase_realtime ADD TABLE public.mux_assets;
ALTER TABLE public.mux_assets REPLICA IDENTITY FULL;