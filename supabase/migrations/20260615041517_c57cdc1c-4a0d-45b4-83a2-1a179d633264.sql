-- Hide sensitive credential columns from client roles (anon/authenticated).
-- Service role retains full access for server-side edge functions.

-- 1) mux_live_streams: stream_key gives RTMP broadcast access
REVOKE SELECT (stream_key) ON public.mux_live_streams FROM anon, authenticated;

-- 2) presave_subscribers: live fan OAuth tokens
REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.presave_subscribers FROM anon, authenticated;

-- 3) smart_link_presaves: live fan OAuth tokens
REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.smart_link_presaves FROM anon, authenticated;