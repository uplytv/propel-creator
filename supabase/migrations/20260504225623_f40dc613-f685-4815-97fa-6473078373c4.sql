ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER TABLE public.live_stream_products REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.mux_live_streams REPLICA IDENTITY FULL;