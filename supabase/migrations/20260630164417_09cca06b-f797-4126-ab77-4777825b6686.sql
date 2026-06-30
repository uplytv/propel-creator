
CREATE POLICY "competition_entries_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'competition-entries');

CREATE POLICY "competition_entries_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'competition-entries'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "competition_entries_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'competition-entries'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "competition_entries_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'competition-entries'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
