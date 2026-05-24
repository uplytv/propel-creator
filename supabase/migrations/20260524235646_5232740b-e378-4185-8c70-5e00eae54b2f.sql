-- 1. mux_live_streams: hide stream_key from public selects via column-level grants.
REVOKE SELECT (stream_key) ON public.mux_live_streams FROM anon, authenticated;
-- Owners need full access; ensure they still have it (idempotent grant).
-- Note: owner reads happen via their RLS policy which already covers them; the
-- column-level revoke above prevents the "Public streams visible to all"
-- policy from leaking stream_key to non-owners.

-- 2. presave_subscribers: hide OAuth tokens from creator selects.
REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.presave_subscribers FROM anon, authenticated;

-- 3. smart_link_presaves: hide OAuth tokens from owner selects.
REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.smart_link_presaves FROM anon, authenticated;

-- 4. event_rsvps: drop the public "viewable by everyone" policy.
DROP POLICY IF EXISTS "RSVPs are viewable by everyone" ON public.event_rsvps;

-- 5. email_unsubscribes: drop the broad public read policy.
DROP POLICY IF EXISTS "Public can read own unsubscribe" ON public.email_unsubscribes;
