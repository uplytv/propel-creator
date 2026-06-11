-- Wristband support: a synced wristband barcode becomes a ticket's credential.
-- 1) record_scan now matches qr_code_secret OR wristband_code, so scanning the
--    wristband at a gate validates the linked ticket.
-- 2) link_wristband() lets box-office staff bind a wristband to a ticket.
-- Additive; replaces the record_scan body (same signature) with the OR lookup.

CREATE OR REPLACE FUNCTION public.record_scan(
  p_qr_secret  text,
  p_event_id   uuid,
  p_direction  text DEFAULT 'in',
  p_gate       text DEFAULT NULL,
  p_device_id  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_result text;
  v_inside int;
  v_holder text;
  v_tier   text;
BEGIN
  IF NOT public.can_scan_event(p_event_id) THEN
    RAISE EXCEPTION 'Not authorized to scan this event';
  END IF;
  IF p_direction NOT IN ('in', 'out') THEN
    p_direction := 'in';
  END IF;

  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE event_id = p_event_id
    AND (qr_code_secret = p_qr_secret OR wristband_code = p_qr_secret)
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.scans(event_id, ticket_id, scanned_by, gate, direction, result, device_id)
    VALUES (p_event_id, NULL, auth.uid(), p_gate, p_direction, 'rejected_not_found', p_device_id);
    RETURN jsonb_build_object('result', 'rejected_not_found', 'message', 'Ticket not found for this event');
  END IF;

  IF v_ticket.status IN ('refunded', 'void', 'transferred') THEN
    v_result := 'rejected_void';
  ELSE
    SELECT COALESCE(SUM(CASE direction WHEN 'in' THEN 1 WHEN 'out' THEN -1 ELSE 0 END), 0)
    INTO v_inside
    FROM public.scans
    WHERE ticket_id = v_ticket.id AND result = 'accepted';

    IF p_direction = 'in' AND v_inside > 0 THEN
      v_result := 'rejected_duplicate';
    ELSIF p_direction = 'out' AND v_inside <= 0 THEN
      v_result := 'rejected_duplicate';
    ELSE
      v_result := 'accepted';
    END IF;
  END IF;

  INSERT INTO public.scans(event_id, ticket_id, scanned_by, gate, direction, result, device_id)
  VALUES (p_event_id, v_ticket.id, auth.uid(), p_gate, p_direction, v_result, p_device_id);

  SELECT COALESCE(display_name, username) INTO v_holder
  FROM public.profiles WHERE user_id = COALESCE(v_ticket.owner_id, v_ticket.buyer_id) LIMIT 1;
  SELECT name INTO v_tier FROM public.ticket_tiers WHERE id = v_ticket.tier_id;

  RETURN jsonb_build_object(
    'result', v_result,
    'ticket_id', v_ticket.id,
    'holder', COALESCE(v_holder, 'Attendee'),
    'tier', v_tier,
    'wristband', v_ticket.wristband_code,
    'direction', p_direction,
    'message', CASE v_result
        WHEN 'accepted'           THEN CASE p_direction WHEN 'in' THEN 'Welcome in' ELSE 'Exit recorded' END
        WHEN 'rejected_duplicate' THEN CASE p_direction WHEN 'in' THEN 'Already inside' ELSE 'Not currently inside' END
        WHEN 'rejected_void'      THEN 'Ticket ' || v_ticket.status
        ELSE 'Rejected'
      END
  );
END;
$$;

-- Bind a wristband barcode to a ticket (box-office / scanner staff).
CREATE OR REPLACE FUNCTION public.link_wristband(
  p_qr_secret      text,
  p_event_id       uuid,
  p_wristband_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
BEGIN
  IF NOT public.can_scan_event(p_event_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this event';
  END IF;
  IF p_wristband_code IS NULL OR length(trim(p_wristband_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Wristband code required');
  END IF;

  SELECT * INTO v_ticket FROM public.tickets
  WHERE event_id = p_event_id AND qr_code_secret = p_qr_secret LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Ticket not found');
  END IF;

  UPDATE public.tickets SET wristband_code = trim(p_wristband_code) WHERE id = v_ticket.id;
  RETURN jsonb_build_object('ok', true, 'ticket_id', v_ticket.id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'message', 'That wristband is already linked to another ticket');
END;
$$;

REVOKE ALL ON FUNCTION public.link_wristband(text, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.link_wristband(text, uuid, text) TO authenticated;
