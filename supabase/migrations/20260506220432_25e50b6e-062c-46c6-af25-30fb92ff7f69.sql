
-- Default qr_code_secret so every new ticket has a private scannable secret distinct from public token
ALTER TABLE public.tickets
  ALTER COLUMN qr_code_secret SET DEFAULT encode(gen_random_bytes(24), 'hex');

-- Backfill any future inserts that omit it (already covered by default), and existing nulls
UPDATE public.tickets SET qr_code_secret = encode(gen_random_bytes(24), 'hex') WHERE qr_code_secret IS NULL;

-- Atomic reserve: returns true if reserved, false if sold out. Caller must rollback if false.
CREATE OR REPLACE FUNCTION public.reserve_event_ticket(p_event_id uuid, p_qty integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qty integer;
  v_sold integer;
BEGIN
  SELECT ticket_quantity, tickets_sold INTO v_qty, v_sold
  FROM events WHERE id = p_event_id FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_qty IS NOT NULL AND (v_sold + p_qty) > v_qty THEN
    RETURN false;
  END IF;

  UPDATE events
    SET tickets_sold = COALESCE(tickets_sold,0) + p_qty,
        is_sold_out = (v_qty IS NOT NULL AND (COALESCE(tickets_sold,0) + p_qty) >= v_qty)
    WHERE id = p_event_id;
  RETURN true;
END;
$$;

-- Atomic check-in: returns json {valid,reason,ticket_id,event_title,scanned_at}
CREATE OR REPLACE FUNCTION public.check_in_ticket_secure(p_qr_secret text, p_scanner uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  ev record;
  now_ts timestamptz := now();
BEGIN
  SELECT * INTO t FROM tickets WHERE qr_code_secret = p_qr_secret FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid ticket');
  END IF;

  SELECT id, creator_id, co_host_ids, title INTO ev FROM events WHERE id = t.event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Event missing');
  END IF;

  IF ev.creator_id <> p_scanner AND NOT (COALESCE(ev.co_host_ids, ARRAY[]::uuid[]) @> ARRAY[p_scanner]) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Not authorized');
  END IF;

  IF t.status = 'scanned' OR t.status = 'used' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Already checked in', 'scanned_at', t.scanned_at);
  END IF;
  IF t.status <> 'active' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Status: ' || t.status);
  END IF;

  UPDATE tickets
    SET status = 'scanned', scanned_at = now_ts, scanned_by = p_scanner,
        checked_in = true, checked_in_at = now_ts
    WHERE id = t.id;

  RETURN jsonb_build_object(
    'valid', true,
    'ticket_id', t.id,
    'buyer_id', t.buyer_id,
    'event_title', ev.title,
    'scanned_at', now_ts
  );
END;
$$;
