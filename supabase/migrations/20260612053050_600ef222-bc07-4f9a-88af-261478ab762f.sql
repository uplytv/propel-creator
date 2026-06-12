DROP POLICY IF EXISTS "Authenticated users can upload blast media" ON storage.objects;
CREATE POLICY "Authenticated users can upload blast media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blast-media'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);