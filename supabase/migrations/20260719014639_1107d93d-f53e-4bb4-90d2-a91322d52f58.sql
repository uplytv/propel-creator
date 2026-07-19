
REVOKE SELECT (stream_key) ON public.mux_live_streams FROM anon, authenticated;
GRANT SELECT (stream_key) ON public.mux_live_streams TO service_role;

DROP POLICY IF EXISTS "Owners can read their own stream key" ON public.mux_live_streams;
CREATE POLICY "Owners can read their own stream key"
  ON public.mux_live_streams
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT (stream_key) ON public.mux_live_streams TO authenticated;
REVOKE SELECT (stream_key) ON public.mux_live_streams FROM anon;

DO $$
DECLARE is_published boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='mux_live_streams'
  ) INTO is_published;

  IF is_published THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.mux_live_streams';
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.mux_live_streams (id, user_id, mux_playback_id, status, is_public, title, description, category, viewer_count, started_at, ended_at, created_at, updated_at, stream_type, featured_product_id, energy_score, slug, channel_category, featured_product_source, hype_train_level, hype_train_expires_at, event_id, is_event_stream, venue_attendance_count, tickets_sold_during_stream, orientation, slow_mode_seconds, is_ppv, ppv_price)';
    EXCEPTION WHEN OTHERS THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.mux_live_streams';
    END;
  END IF;
END $$;
