-- Event Live-Stream PPV: let creators sell a "watch from home" pass to their
-- IRL/hybrid events. Additive.
--   - ticket_tiers.is_livestream marks a tier as a PPV livestream pass
--     (no door admission; grants access to the event's Mux stream).
--   - has_event_livestream_access() gates the viewer server-side: the creator,
--     or anyone holding a non-refunded ticket for the event, may watch.
ALTER TABLE public.ticket_tiers
  ADD COLUMN IF NOT EXISTS is_livestream boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_event_livestream_access(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = _event_id AND e.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.event_id = _event_id
        AND COALESCE(t.owner_id, t.buyer_id) = auth.uid()
        AND t.status NOT IN ('refunded', 'void', 'transferred')
    );
$$;

REVOKE ALL ON FUNCTION public.has_event_livestream_access(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_event_livestream_access(uuid) TO authenticated;
