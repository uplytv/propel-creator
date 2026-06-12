
CREATE OR REPLACE FUNCTION public.set_event_fee_change_reason(reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can set fee change reason';
  END IF;
  PERFORM set_config('app.fee_change_reason', COALESCE(reason, ''), true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_event_fee_change_reason(text) TO authenticated;
