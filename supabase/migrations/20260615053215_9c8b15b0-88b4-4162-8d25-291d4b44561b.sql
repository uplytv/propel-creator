-- ============================================================
-- 20260611160000_gate_community_classroom_access
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_creator_access(_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = _creator_id
    OR EXISTS (
      SELECT 1 FROM public.member_subscriptions ms
      WHERE ms.member_id = auth.uid()
        AND ms.creator_id = _creator_id
        AND ms.status IN ('active', 'trialing')
    )
    OR EXISTS (
      SELECT 1
      FROM public.access_grants ag
      JOIN public.creator_spaces cs ON cs.id = ag.resource_id
      WHERE ag.user_id = auth.uid()
        AND ag.revoked_at IS NULL
        AND ag.resource_type = 'community'
        AND cs.creator_id = _creator_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.community_members cm
      JOIN public.creator_spaces cs ON cs.creator_id = cm.creator_id
      WHERE cm.user_id = auth.uid()
        AND cm.creator_id = _creator_id
        AND cs.is_free = true
    );
$$;

REVOKE ALL ON FUNCTION public.has_creator_access(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_creator_access(uuid) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view community posts" ON public.community_posts;
CREATE POLICY "View community posts with access"
  ON public.community_posts FOR SELECT TO authenticated
  USING (
    auth.uid() = author_id
    OR public.has_creator_access(creator_id)
  );

DROP POLICY IF EXISTS "Anyone can view comments" ON public.community_comments;
CREATE POLICY "View comments with access"
  ON public.community_comments FOR SELECT TO authenticated
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = community_comments.post_id
        AND public.has_creator_access(p.creator_id)
    )
  );

DROP POLICY IF EXISTS "Anyone can view modules" ON public.classroom_modules;
CREATE POLICY "View free or accessible modules"
  ON public.classroom_modules FOR SELECT TO authenticated
  USING (
    is_free
    OR public.has_creator_access(creator_id)
  );

DROP POLICY IF EXISTS "Anyone can view lessons" ON public.classroom_lessons;
CREATE POLICY "View free or accessible lessons"
  ON public.classroom_lessons FOR SELECT TO authenticated
  USING (
    is_free
    OR public.has_creator_access(creator_id)
  );

-- ============================================================
-- 20260611170000_tickets_phase3a_staff_scans — TABLES FIRST
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  role        text NOT NULL DEFAULT 'scanner'
              CHECK (role IN ('owner','manager','scanner','box_office')),
  gate        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_staff_event ON public.event_staff (event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user  ON public.event_staff (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_staff TO authenticated;
GRANT ALL ON public.event_staff TO service_role;

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id   uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  scanned_by  uuid NOT NULL,
  gate        text,
  direction   text NOT NULL DEFAULT 'in'  CHECK (direction IN ('in','out')),
  result      text NOT NULL
              CHECK (result IN (
                'accepted',
                'rejected_duplicate',
                'rejected_void',
                'rejected_wrong_day',
                'rejected_wrong_gate',
                'rejected_not_found'
              )),
  device_id   text,
  lat         double precision,
  lng         double precision,
  scanned_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scans_event_time ON public.scans (event_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_ticket     ON public.scans (ticket_id);

GRANT SELECT, INSERT ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scans;
  END IF;
END $$;

-- ── Access helpers (must come AFTER event_staff table exists) ──
CREATE OR REPLACE FUNCTION public.can_scan_event(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.events e
            WHERE e.id = _event_id AND e.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_staff s
               WHERE s.event_id = _event_id AND s.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.can_manage_event(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.events e
            WHERE e.id = _event_id AND e.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_staff s
               WHERE s.event_id = _event_id AND s.user_id = auth.uid()
                 AND s.role IN ('owner','manager'));
$$;

REVOKE ALL ON FUNCTION public.can_scan_event(uuid)   FROM public;
REVOKE ALL ON FUNCTION public.can_manage_event(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_scan_event(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_event(uuid) TO authenticated;

-- ── event_staff policies (depend on can_manage_event) ──
CREATE POLICY "Staff or managers can view event staff"
  ON public.event_staff FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_manage_event(event_id));

CREATE POLICY "Managers can add event staff"
  ON public.event_staff FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_event(event_id));

CREATE POLICY "Managers can update event staff"
  ON public.event_staff FOR UPDATE TO authenticated
  USING (public.can_manage_event(event_id))
  WITH CHECK (public.can_manage_event(event_id));

CREATE POLICY "Managers can remove event staff"
  ON public.event_staff FOR DELETE TO authenticated
  USING (public.can_manage_event(event_id));

-- ── scans policies (depend on can_scan_event / can_manage_event) ──
CREATE POLICY "Scanners can record scans"
  ON public.scans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = scanned_by AND public.can_scan_event(event_id));

CREATE POLICY "Managers can read scan log"
  ON public.scans FOR SELECT TO authenticated
  USING (auth.uid() = scanned_by OR public.can_manage_event(event_id));

-- ── New columns for wristbands + multi-day passes ──
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS wristband_code text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_wristband_code
  ON public.tickets (wristband_code) WHERE wristband_code IS NOT NULL;

ALTER TABLE public.ticket_tiers
  ADD COLUMN IF NOT EXISTS is_wristband  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS day_validity  jsonb;

-- ── Live occupancy view ──
CREATE OR REPLACE VIEW public.event_occupancy
WITH (security_invoker = on) AS
SELECT
  s.event_id,
  COUNT(*) FILTER (WHERE s.direction = 'in'  AND s.result = 'accepted')
    - COUNT(*) FILTER (WHERE s.direction = 'out' AND s.result = 'accepted') AS current_occupancy,
  COUNT(*) FILTER (WHERE s.direction = 'in'  AND s.result = 'accepted')     AS total_in,
  COUNT(*) FILTER (WHERE s.direction = 'out' AND s.result = 'accepted')     AS total_out,
  COUNT(*) FILTER (WHERE s.result <> 'accepted')                           AS total_rejected,
  MAX(s.scanned_at)                                                        AS last_scan_at
FROM public.scans s
GROUP BY s.event_id;

-- ============================================================
-- 20260611180000_event_platform_fee
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS platform_fee_pct numeric NOT NULL DEFAULT 0.05
  CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 0.30);

COMMENT ON COLUMN public.events.platform_fee_pct IS
  'Platform fee as a fraction of ticket price (0.05 = 5%). Default 5%; creator-configurable per event. Read by the purchase-ticket edge function.';

-- ============================================================
-- 20260611190000_record_scan_rpc + my_scannable_events
-- ============================================================

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

REVOKE ALL ON FUNCTION public.record_scan(text, uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_scan(text, uuid, text, text, text) TO authenticated;

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

-- ============================================================
-- 20260611200000_wristbands
-- ============================================================

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
