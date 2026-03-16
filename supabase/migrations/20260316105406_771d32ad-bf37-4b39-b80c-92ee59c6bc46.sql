
-- Only stream owners can read from mux_live_streams directly (gets stream_key)
-- Non-owners must use the mux_live_streams_public view
DROP POLICY IF EXISTS "Public streams visible to all" ON public.mux_live_streams;
CREATE POLICY "Public streams visible to all"
  ON public.mux_live_streams FOR SELECT
  TO public
  USING (auth.uid() = user_id);
