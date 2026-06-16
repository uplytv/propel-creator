-- Event Live-Stream PPV
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