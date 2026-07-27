
CREATE TABLE IF NOT EXISTS public.claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_phone TEXT,
  requester_email TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_requests_business_idx ON public.claim_requests(business_id);
CREATE INDEX IF NOT EXISTS claim_requests_requester_idx ON public.claim_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS claim_requests_status_idx ON public.claim_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.claim_requests TO authenticated;
GRANT ALL ON public.claim_requests TO service_role;

ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY claim_requests_requester_insert ON public.claim_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY claim_requests_requester_read ON public.claim_requests
  FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY claim_requests_admin_update ON public.claim_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_claim_requests_updated_at
  BEFORE UPDATE ON public.claim_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ownership transfer: admin-only, moves a business profile to a new owner + marks live.
CREATE OR REPLACE FUNCTION public.transfer_business_ownership(
  _business_id UUID,
  _new_owner UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Free the target owner from any other business shell they might own is not
  -- our concern here; profiles.user_id is UNIQUE so this will fail loudly if
  -- the new owner already owns a profile row.
  UPDATE public.profiles
     SET user_id = _new_owner,
         business_status = 'live',
         updated_at = now()
   WHERE id = _business_id
     AND account_type = 'business';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'business profile % not found', _business_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_business_ownership(UUID, UUID) TO authenticated;
