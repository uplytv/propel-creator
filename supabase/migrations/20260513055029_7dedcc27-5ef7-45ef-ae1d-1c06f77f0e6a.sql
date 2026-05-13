CREATE TABLE IF NOT EXISTS public.radio_station_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seed_type text NOT NULL CHECK (seed_type IN ('track','artist')),
  seed_id uuid NOT NULL,
  excluded_track_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, seed_type, seed_id, excluded_track_id)
);

CREATE INDEX IF NOT EXISTS radio_station_exclusions_user_seed_idx
  ON public.radio_station_exclusions (user_id, seed_type, seed_id);

ALTER TABLE public.radio_station_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rse_select_own" ON public.radio_station_exclusions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rse_insert_own" ON public.radio_station_exclusions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rse_delete_own" ON public.radio_station_exclusions
  FOR DELETE USING (auth.uid() = user_id);