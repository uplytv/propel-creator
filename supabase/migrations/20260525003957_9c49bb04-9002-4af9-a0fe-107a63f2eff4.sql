
-- =========================================================================
-- 1) Fix: Exposed Auth Users + Security Definer View
--    Recreate unified_referral_leaderboard as SECURITY INVOKER and remove
--    the direct auth.users join via a SECURITY DEFINER helper.
-- =========================================================================

CREATE OR REPLACE FUNCTION public._user_referral_total(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    COALESCE((SELECT count(*) FROM public.referrals r WHERE r.referrer_id = p_user_id), 0)
    + COALESCE((
        SELECT w.referral_count
        FROM public.waitlist w
        WHERE w.email = (SELECT au.email::text FROM auth.users au WHERE au.id = p_user_id LIMIT 1)
        LIMIT 1
      ), 0);
$$;

REVOKE EXECUTE ON FUNCTION public._user_referral_total(uuid) FROM PUBLIC, anon, authenticated;

DROP VIEW IF EXISTS public.unified_referral_leaderboard;

CREATE VIEW public.unified_referral_leaderboard
WITH (security_invoker = true) AS
SELECT
  p.user_id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.is_approved,
  p.origin_member,
  p.role_type,
  public._user_referral_total(p.user_id) AS total_referrals
FROM public.profiles p
WHERE p.onboarding_complete = true
ORDER BY public._user_referral_total(p.user_id) DESC;

-- Allow the view function to be used implicitly when reading the view.
GRANT EXECUTE ON FUNCTION public._user_referral_total(uuid) TO anon, authenticated;

-- =========================================================================
-- 2) Fix: RTMP stream_key readable by anyone on public mux_live_streams rows
--    Revoke column-level SELECT on stream_key for anon/authenticated.
--    Owners can still read their own key via a dedicated SECURITY DEFINER fn.
-- =========================================================================

REVOKE SELECT (stream_key) ON public.mux_live_streams FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_stream_key(p_stream_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT stream_key
  FROM public.mux_live_streams
  WHERE id = p_stream_id AND user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_stream_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_stream_key(uuid) TO authenticated;

-- =========================================================================
-- 3) Fix: Fan OAuth tokens readable by creators (presave_subscribers)
-- =========================================================================

REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.presave_subscribers FROM anon, authenticated;

-- =========================================================================
-- 4) Fix: Fan OAuth tokens readable by creators (smart_link_presaves)
-- =========================================================================

REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.smart_link_presaves FROM anon, authenticated;
