
CREATE OR REPLACE FUNCTION public.admin_update_event_fee(
  _event_id uuid,
  _new_fee_pct numeric,
  _reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can update event fees';
  END IF;
  IF _new_fee_pct IS NULL OR _new_fee_pct < 0 OR _new_fee_pct > 100 THEN
    RAISE EXCEPTION 'Fee must be between 0 and 100';
  END IF;

  PERFORM set_config('app.fee_change_reason', COALESCE(_reason, ''), true);

  UPDATE public.events
  SET platform_fee_pct = _new_fee_pct
  WHERE id = _event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_event_fee(uuid, numeric, text) TO authenticated;
