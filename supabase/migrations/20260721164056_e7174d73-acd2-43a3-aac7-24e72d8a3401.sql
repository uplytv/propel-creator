ALTER TABLE public.mux_live_streams
  ADD COLUMN IF NOT EXISTS series_name TEXT,
  ADD COLUMN IF NOT EXISTS episode_number INTEGER;