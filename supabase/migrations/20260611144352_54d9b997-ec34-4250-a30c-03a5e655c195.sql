
-- 1) mux_live_streams.stream_key — column-level revoke from public roles
REVOKE SELECT (stream_key) ON public.mux_live_streams FROM anon, authenticated;

-- 2) presave_subscribers OAuth tokens — column-level revoke
REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.presave_subscribers FROM anon, authenticated;

-- 3) smart_link_presaves OAuth tokens — column-level revoke
REVOKE SELECT (spotify_access_token, spotify_refresh_token, apple_music_user_token)
  ON public.smart_link_presaves FROM anon, authenticated;

-- 4) avatars bucket — owner folder enforcement
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 5) newsletter-images bucket — owner folder enforcement on upload
DROP POLICY IF EXISTS "Auth users upload newsletter images" ON storage.objects;
CREATE POLICY "Auth users upload newsletter images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'newsletter-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 6) podcast-audio bucket — owner folder enforcement on upload
DROP POLICY IF EXISTS "Auth users upload podcast audio" ON storage.objects;
CREATE POLICY "Auth users upload podcast audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'podcast-audio'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
