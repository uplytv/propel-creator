DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'claim_requests'
      AND policyname = 'claim_requests_requester_phone_update'
  ) THEN
    CREATE POLICY claim_requests_requester_phone_update
    ON public.claim_requests
    FOR UPDATE TO authenticated
    USING (
      requester_user_id = auth.uid()
      AND status = 'pending'
    )
    WITH CHECK (
      requester_user_id = auth.uid()
      AND status = 'pending'
    );
  END IF;
END $$;