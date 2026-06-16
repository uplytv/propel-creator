
-- Revoke column-level SELECT on sensitive credentials/PII from client roles.
-- service_role (used by edge functions) retains access.

REVOKE SELECT (access_token, refresh_token) ON public.ad_connections FROM authenticated, anon;
REVOKE SELECT (access_token) ON public.ad_integrations FROM authenticated, anon;
REVOKE SELECT (secret) ON public.api_webhooks FROM authenticated, anon;
REVOKE SELECT (subscriber_email) ON public.broadcast_tracking_events FROM authenticated, anon;
REVOKE SELECT (access_token, refresh_token) ON public.creator_platform_oauth FROM authenticated, anon;
REVOKE SELECT (access_token) ON public.creator_shopify_stores FROM authenticated, anon;
REVOKE SELECT (access_token, refresh_token) ON public.dsp_connections FROM authenticated, anon;
REVOKE SELECT (writer_email) ON public.music_split_sheet_writers FROM authenticated, anon;
REVOKE SELECT (stream_key) ON public.mux_live_streams FROM authenticated, anon;
REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token) ON public.presave_subscribers FROM authenticated, anon;
REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token) ON public.smart_link_presaves FROM authenticated, anon;
