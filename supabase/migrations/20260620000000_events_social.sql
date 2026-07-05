-- Event social features: public guest list (POSH) + sold-out waitlist (Ticketmaster).
-- Public viewers can't read the tickets table directly (RLS), so these
-- SECURITY DEFINER functions expose only the minimal, non-sensitive fields.

-- Guest list: de-duplicated preview of who's going (active-ticket holders).
CREATE OR REPLACE FUNCTION public.event_guest_list(p_event_id uuid, p_limit int DEFAULT 12)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (p.user_id) p.user_id, p.display_name, p.avatar_url
  FROM public.tickets t
  JOIN public.profiles p ON p.user_id = t.buyer_id
  WHERE t.event_id = p_event_id AND t.status = 'active'
  ORDER BY p.user_id
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;
GRANT EXECUTE ON FUNCTION public.event_guest_list(uuid, int) TO authenticated, anon;

-- Waitlist for sold-out events.
CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_waitlist_event ON public.event_waitlist (event_id);

ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

-- A user manages their own waitlist entry; the event host can read the list.
DROP POLICY IF EXISTS "ewl_owner" ON public.event_waitlist;
CREATE POLICY "ewl_owner" ON public.event_waitlist
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ewl_host_read" ON public.event_waitlist;
CREATE POLICY "ewl_host_read" ON public.event_waitlist
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.event_waitlist TO authenticated;

-- Join waitlist (idempotent).
CREATE OR REPLACE FUNCTION public.join_event_waitlist(p_event_id uuid, p_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.event_waitlist (event_id, user_id, email)
  VALUES (p_event_id, auth.uid(), p_email)
  ON CONFLICT (event_id, user_id) DO NOTHING;
END; $$;
GRANT EXECUTE ON FUNCTION public.join_event_waitlist(uuid, text) TO authenticated;

-- Waitlist count (public — "N waiting" social proof).
CREATE OR REPLACE FUNCTION public.event_waitlist_count(p_event_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::bigint FROM public.event_waitlist WHERE event_id = p_event_id;
$$;
GRANT EXECUTE ON FUNCTION public.event_waitlist_count(uuid) TO authenticated, anon;

-- Whether the current user is already on the waitlist.
CREATE OR REPLACE FUNCTION public.is_on_event_waitlist(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_waitlist WHERE event_id = p_event_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_on_event_waitlist(uuid) TO authenticated;
