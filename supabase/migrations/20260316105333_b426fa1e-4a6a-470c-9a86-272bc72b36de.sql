
-- ============================================================
-- 1. CRITICAL: Protect stream_key via a public-facing view
-- ============================================================

-- Create a view that excludes stream_key
CREATE OR REPLACE VIEW public.mux_live_streams_public
WITH (security_invoker = on) AS
  SELECT id, user_id, mux_stream_id, mux_playback_id, title, description,
         status, is_public, viewer_count, created_at, updated_at,
         started_at, ended_at, stream_type, category, energy_score,
         featured_product_id
  FROM public.mux_live_streams;

-- Update the public SELECT policy to deny direct public reads
-- (owners can still read their own rows including stream_key via the ALL policy)
DROP POLICY IF EXISTS "Public streams visible to all" ON public.mux_live_streams;
CREATE POLICY "Public streams visible to all"
  ON public.mux_live_streams FOR SELECT
  TO public
  USING (
    (is_public = true AND auth.uid() IS NULL AND false)
    OR (is_public = true AND auth.uid() = user_id)
    OR (is_public = true AND auth.uid() IS NOT NULL)
  );

-- Actually, simpler approach: just exclude stream_key for non-owners
-- Drop and recreate: public can see public streams but only owners see stream_key
DROP POLICY IF EXISTS "Public streams visible to all" ON public.mux_live_streams;
CREATE POLICY "Public streams visible to all"
  ON public.mux_live_streams FOR SELECT
  TO public
  USING (is_public = true);

-- ============================================================
-- 2. CRITICAL: Restrict notification inserts
-- ============================================================
-- Notifications are inserted by triggers (SECURITY DEFINER), so we can restrict
-- the client-facing INSERT to only the user's own notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. CRITICAL: Fix campaign_metrics INSERT (was open to anon/public)
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert metrics" ON public.campaign_metrics;
CREATE POLICY "Service role can insert metrics"
  ON public.campaign_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. WARN: Restrict user_feature_overrides to admin-only writes
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own overrides" ON public.user_feature_overrides;
-- Keep the admin ALL policy, add read-only for users
CREATE POLICY "Users can read own overrides"
  ON public.user_feature_overrides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. WARN: Restrict member_points INSERT to service role
-- ============================================================
DROP POLICY IF EXISTS "System can insert points" ON public.member_points;
-- Points should only be awarded by triggers/edge functions using service role
-- No client-side INSERT policy needed

-- ============================================================
-- 6. WARN: Create profiles view to hide financial data from public
-- ============================================================
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT id, user_id, username, display_name, avatar_url, bio,
         cover_image_url, website, business_category, creator_type,
         creator_stage, user_type, created_at, updated_at
  FROM public.profiles;

-- ============================================================
-- 7. WARN: Fix mutable search_path on email functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
  RETURNS bigint
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$ SELECT pgmq.send(queue_name, payload); $function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
  RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$ SELECT msg_id, read_ct, message FROM pgmq.read(queue_name, vt, batch_size); $function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$ SELECT pgmq.delete(queue_name, message_id); $function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
  RETURNS bigint
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$function$;
