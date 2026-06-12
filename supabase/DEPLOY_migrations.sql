-- UPLY ticketing + security migrations — paste this ENTIRE file into the
-- Supabase SQL Editor and Run. Order matters; it is already correct.
-- Safe to re-run: policies use DROP IF EXISTS, functions use CREATE OR REPLACE,
-- columns/tables use IF NOT EXISTS.


-- ============================================================
-- 20260611160000_gate_community_classroom_access
-- ============================================================
-- AUDIT.md 1B #1-#2: close the community/classroom RLS revenue leaks.
--
-- Previously community_posts, community_comments, classroom_modules, and
-- classroom_lessons all had `FOR SELECT TO authenticated USING (true)`, so any
-- logged-in user could read every creator's paid content directly via the API
-- (the paywall was only a client-side blur). This migration replaces those
-- policies with server-side access checks.
--
-- Access model (verified against checkout/grant code):
--   * paid communities/tiers  -> member_subscriptions (member_id, creator_id, status)
--   * paid OR free community access grants -> access_grants(resource_type='community',
--     resource_id = creator_spaces.id)
--   * free communities         -> community_members roster (only trusted when the
--     space is_free = true, since community_members is self-insertable)
-- Free classroom modules/lessons (is_free = true) remain publicly viewable.
--
-- Only RLS policies + one helper function change here; no tables/columns are
-- added or dropped, and no data is modified.

-- ── Access helper (SECURITY DEFINER so it can read membership tables without
--    being blocked by their own RLS; STABLE; pinned search_path) ─────────────
CREATE OR REPLACE FUNCTION public.has_creator_access(_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- the creator themselves
    auth.uid() = _creator_id
    -- active paid subscription to this creator
    OR EXISTS (
      SELECT 1 FROM public.member_subscriptions ms
      WHERE ms.member_id = auth.uid()
        AND ms.creator_id = _creator_id
        AND ms.status IN ('active', 'trialing')
    )
    -- explicit community access grant (paid checkout or free-join grant)
    OR EXISTS (
      SELECT 1
      FROM public.access_grants ag
      JOIN public.creator_spaces cs ON cs.id = ag.resource_id
      WHERE ag.user_id = auth.uid()
        AND ag.revoked_at IS NULL
        AND ag.resource_type = 'community'
        AND cs.creator_id = _creator_id
    )
    -- free community: roster membership is sufficient (self-insert is harmless
    -- here because the space is free anyway)
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

-- ── community_posts ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view community posts" ON public.community_posts;
CREATE POLICY "View community posts with access"
  ON public.community_posts FOR SELECT TO authenticated
  USING (
    auth.uid() = author_id
    OR public.has_creator_access(creator_id)
  );

-- ── community_comments (no creator_id; resolve via the parent post) ──────────
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

-- ── classroom_modules (free modules stay public) ────────────────────────────
DROP POLICY IF EXISTS "Anyone can view modules" ON public.classroom_modules;
CREATE POLICY "View free or accessible modules"
  ON public.classroom_modules FOR SELECT TO authenticated
  USING (
    is_free
    OR public.has_creator_access(creator_id)
  );

-- ── classroom_lessons (free lessons stay public) ────────────────────────────
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.classroom_lessons;
CREATE POLICY "View free or accessible lessons"
  ON public.classroom_lessons FOR SELECT TO authenticated
  USING (
    is_free
    OR public.has_creator_access(creator_id)
  );


-- ============================================================
-- 20260611170000_tickets_phase3a_staff_scans
-- ============================================================
-- Phase 3A — festival-scale ticketing data-model delta.
-- ADDITIVE ONLY: new tables (event_staff, scans), new columns, an occupancy
-- view, and helper functions. Nothing existing is altered or dropped, and the
-- existing check_in_ticket_secure() scan path is untouched. Every new table
-- ships with RLS in this migration.

-- ─────────────────────────────────────────────────────────────────────────
-- Access helpers (SECURITY DEFINER so they can read event_staff without being
-- blocked by its own RLS — this also prevents policy recursion).
-- ─────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────
-- event_staff: who can scan/manage an event, and at which gate.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  role        text NOT NULL DEFAULT 'scanner'
              CHECK (role IN ('owner','manager','scanner','box_office')),
  gate        text,                       -- optional gate / entry-point assignment
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_staff_event ON public.event_staff (event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_user  ON public.event_staff (user_id);

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

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

-- ─────────────────────────────────────────────────────────────────────────
-- scans: append-only entry/exit audit log (one row per scan attempt).
-- No UPDATE/DELETE policies exist -> rows are immutable under RLS.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id   uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  scanned_by  uuid NOT NULL,              -- staff user id
  gate        text,                       -- entry point / gate label
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

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Insert-only for authorized scanners; the scanned_by must be the caller.
CREATE POLICY "Scanners can record scans"
  ON public.scans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = scanned_by AND public.can_scan_event(event_id));

-- Managers (and the scanner who made the scan) can read the log.
CREATE POLICY "Managers can read scan log"
  ON public.scans FOR SELECT TO authenticated
  USING (auth.uid() = scanned_by OR public.can_manage_event(event_id));
-- (No UPDATE or DELETE policy => append-only audit trail.)

-- Live dashboards subscribe to new scans via Supabase Realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE public.scans;

-- ─────────────────────────────────────────────────────────────────────────
-- New columns for wristbands + multi-day passes (additive, safe defaults).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS wristband_code text;
-- A physical wristband barcode maps to at most one ticket.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_wristband_code
  ON public.tickets (wristband_code) WHERE wristband_code IS NOT NULL;

ALTER TABLE public.ticket_tiers
  ADD COLUMN IF NOT EXISTS is_wristband  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS day_validity  jsonb;   -- e.g. ["2026-07-01","2026-07-02"] for multi-day passes

-- ─────────────────────────────────────────────────────────────────────────
-- Live occupancy view: accepted ins minus accepted outs per event.
-- security_invoker => respects the scans RLS above (managers/staff only).
-- ─────────────────────────────────────────────────────────────────────────
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
-- Per-event configurable platform fee (explicitly requested).
-- Additive: new column with the existing 5% as the default, so all current
-- events and the legacy flow are unchanged. Stored as a fraction (0.05 = 5%).
-- Capped at 30% to prevent fat-finger / abusive values.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS platform_fee_pct numeric NOT NULL DEFAULT 0.05
  CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 0.30);

COMMENT ON COLUMN public.events.platform_fee_pct IS
  'Platform fee as a fraction of ticket price (0.05 = 5%). Default 5%; creator-configurable per event. Read by the purchase-ticket edge function.';


-- ============================================================
-- 20260611190000_record_scan_rpc
-- ============================================================
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


-- ============================================================
-- 20260611200000_wristbands
-- ============================================================
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

