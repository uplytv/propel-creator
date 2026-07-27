DROP POLICY IF EXISTS claim_requests_requester_phone_update ON public.claim_requests;

CREATE OR REPLACE FUNCTION public.update_my_claim_request_phone(
  _claim_request_id UUID,
  _requester_phone TEXT
) RETURNS public.claim_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.claim_requests;
BEGIN
  UPDATE public.claim_requests
     SET requester_phone = NULLIF(BTRIM(_requester_phone), ''),
         updated_at = now()
   WHERE id = _claim_request_id
     AND requester_user_id = auth.uid()
     AND status = 'pending'
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Claim request not found or no longer editable';
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_claim_request_phone(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_claim_request_phone(UUID, TEXT) TO authenticated;