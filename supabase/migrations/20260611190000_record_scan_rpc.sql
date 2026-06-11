-- Staff-facing scan RPC + "events I can scan" helper for the scanner PWA.
-- Additive. The existing check_in_ticket_secure() (creator/co_host only) is
-- left untouched; record_scan() is the new event_staff-aware path that writes
-- to the append-only public.scans log and supports in/out direction + gates.
-- Ticket.status is intentionally NOT modified here — the scans log is the
-- source of truth for occupancy, so this doesn't disturb the legacy scanner.

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
  WHERE qr_code_secret = p_qr_secret AND event_id = p_event_id
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.scans(event_id, ticket_id, scanned_by, gate, direction, result, device_id)
    VALUES (p_event_id, NULL, auth.uid(), p_gate, p_direction, 'rejected_not_found', p_device_id);
    RETURN jsonb_build_object('result', 'rejected_not_found', 'message', 'Ticket not found for this event');
  END IF;

  IF v_ticket.status IN ('refunded', 'void', 'transferred') THEN
    v_result := 'rejected_void';
  ELSE
    -- net presence = accepted ins minus accepted outs
    SELECT COALESCE(SUM(CASE direction WHEN 'in' THEN 1 WHEN 'out' THEN -1 ELSE 0 END), 0)
    INTO v_inside
    FROM public.scans
    WHERE ticket_id = v_ticket.id AND result = 'accepted';

    IF p_direction = 'in' AND v_inside > 0 THEN
      v_result := 'rejected_duplicate';            -- already inside (no re-entry)
    ELSIF p_direction = 'out' AND v_inside <= 0 THEN
      v_result := 'rejected_duplicate';            -- can't exit; never entered
    ELSE
      v_result := 'accepted';
    END IF;
  END IF;

  INSERT INTO public.scans(event_id, ticket_id, scanned_by, gate, direction, result, device_id)
  VALUES (p_event_id, v_ticket.id, auth.uid(), p_gate, p_direction, v_result, p_device_id);

  SELECT COALESCE(display_name, username) INTO v_holder
  FROM public.profiles
  WHERE user_id = COALESCE(v_ticket.owner_id, v_ticket.buyer_id)
  LIMIT 1;
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

REVOKE ALL ON FUNCTION public.record_scan(text, uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_scan(text, uuid, text, text, text) TO authenticated;

-- Events the current user may scan (creator or assigned staff).
CREATE OR REPLACE FUNCTION public.my_scannable_events()
RETURNS TABLE(event_id uuid, title text, starts_at timestamptz, role text, gate text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.title, e.starts_at, 'owner'::text AS role, NULL::text AS gate
  FROM public.events e
  WHERE e.creator_id = auth.uid()
  UNION
  SELECT e.id, e.title, e.starts_at, s.role, s.gate
  FROM public.event_staff s
  JOIN public.events e ON e.id = s.event_id
  WHERE s.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_scannable_events() FROM public;
GRANT EXECUTE ON FUNCTION public.my_scannable_events() TO authenticated;
