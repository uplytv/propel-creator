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
