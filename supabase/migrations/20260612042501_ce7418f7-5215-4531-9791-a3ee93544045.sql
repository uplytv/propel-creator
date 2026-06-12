-- Lock down fan OAuth tokens: revoke column-level SELECT from client roles.
-- Service role (used by edge functions) bypasses this and continues to work.

REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.presave_subscribers FROM anon, authenticated;

REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.smart_link_presaves FROM anon, authenticated;