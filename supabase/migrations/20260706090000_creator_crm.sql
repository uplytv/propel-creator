-- ═══════════════════════════════════════════════════════════════
-- Creator CRM v1 — contacts + activities + sync function
-- Aggregates existing relationship data (community members, email
-- subscribers, product buyers, ticket buyers, booking inquiries)
-- into one creator-owned contact list. Does NOT duplicate source
-- tables as systems of record — crm_contacts is a working index.
-- ═══════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL,
  name text,
  phone text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('member','subscriber','buyer','ticket','booking','manual')),
  tags text[] NOT NULL DEFAULT '{}',
  stage text NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead','engaged','customer','vip')),
  notes_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, email)
);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('note','task','call','email')),
  body text NOT NULL,
  due_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_creator_activity
  ON public.crm_contacts (creator_id, last_activity_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_creator_stage
  ON public.crm_contacts (creator_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact
  ON public.crm_activities (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_creator
  ON public.crm_activities (creator_id);

-- ── RLS: creator manages own rows only, no public access ───────

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own crm contacts"
  ON public.crm_contacts
  FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators manage own crm activities"
  ON public.crm_activities
  FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
GRANT ALL ON public.crm_activities TO service_role;

-- ── updated_at + activity counters (trigger-maintained) ────────

CREATE OR REPLACE FUNCTION public.crm_contacts_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_contacts_updated_at ON public.crm_contacts;
CREATE TRIGGER trg_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_contacts_touch_updated_at();

-- Keep notes_count + last_activity_at in sync when activities change.
-- SECURITY DEFINER so the counter update never trips over RLS edge cases.
CREATE OR REPLACE FUNCTION public.crm_activities_touch_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.crm_contacts
       SET notes_count = notes_count + 1,
           last_activity_at = GREATEST(COALESCE(last_activity_at, NEW.created_at), NEW.created_at)
     WHERE id = NEW.contact_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.crm_contacts
       SET notes_count = GREATEST(notes_count - 1, 0)
     WHERE id = OLD.contact_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_activities_touch_contact ON public.crm_activities;
CREATE TRIGGER trg_crm_activities_touch_contact
  AFTER INSERT OR DELETE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.crm_activities_touch_contact();

-- ── Sync function ───────────────────────────────────────────────
-- Owner-only (guard: auth.uid() = p_creator_id). SECURITY DEFINER is
-- required to read auth.users emails for user_id-linked sources
-- (profiles has no email column) and to read booking inquiries
-- (their RLS is admin-only). Existing contacts keep their original
-- source/stage/name; sync only fills gaps and advances last_activity_at.
-- Returns the number of contact rows inserted or refreshed.
CREATE OR REPLACE FUNCTION public.crm_sync_contacts(p_creator_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_creator_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- 1) Community members (+ paying member subscriptions) → source 'member'
  --    email from auth.users, name from profiles.
  INSERT INTO public.crm_contacts (creator_id, user_id, email, name, source, last_activity_at)
  SELECT
    p_creator_id,
    m.user_id,
    lower(au.email),
    COALESCE(
      NULLIF(btrim(pr.display_name), ''),
      NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
      pr.username
    ),
    'member',
    m.last_at
  FROM (
    SELECT user_id, MAX(last_at) AS last_at
    FROM (
      SELECT cm.user_id, cm.joined_at AS last_at
      FROM public.community_members cm
      WHERE cm.creator_id = p_creator_id
      UNION ALL
      SELECT ms.member_id, GREATEST(ms.created_at, COALESCE(ms.current_period_start, ms.created_at))
      FROM public.member_subscriptions ms
      WHERE ms.creator_id = p_creator_id
    ) src
    GROUP BY user_id
  ) m
  JOIN auth.users au ON au.id = m.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = m.user_id
  WHERE au.email IS NOT NULL
  ON CONFLICT (creator_id, email) DO UPDATE SET
    user_id = COALESCE(public.crm_contacts.user_id, EXCLUDED.user_id),
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(
      COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at),
      COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total := v_total + v_count;

  -- 2) Email subscribers → source 'subscriber' (email/name live on the row)
  INSERT INTO public.crm_contacts (creator_id, email, name, source, last_activity_at)
  SELECT DISTINCT ON (lower(s.email))
    p_creator_id,
    lower(s.email),
    NULLIF(btrim(s.name), ''),
    'subscriber',
    GREATEST(
      s.created_at,
      COALESCE(s.last_seen_at, s.created_at),
      COALESCE(s.last_open_at, s.created_at),
      COALESCE(s.last_click_at, s.created_at)
    )
  FROM public.subscribers s
  WHERE s.creator_id = p_creator_id
    AND s.email IS NOT NULL AND btrim(s.email) <> ''
  ORDER BY lower(s.email), s.created_at DESC
  ON CONFLICT (creator_id, email) DO UPDATE SET
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(
      COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at),
      COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total := v_total + v_count;

  -- 3) Product buyers → source 'buyer' (completed purchases only)
  INSERT INTO public.crm_contacts (creator_id, user_id, email, name, source, last_activity_at)
  SELECT
    p_creator_id,
    b.buyer_id,
    lower(au.email),
    COALESCE(
      NULLIF(btrim(pr.display_name), ''),
      NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
      pr.username
    ),
    'buyer',
    b.last_at
  FROM (
    SELECT pp.buyer_id, MAX(pp.created_at) AS last_at
    FROM public.product_purchases pp
    WHERE pp.creator_id = p_creator_id AND pp.status = 'completed'
    GROUP BY pp.buyer_id
  ) b
  JOIN auth.users au ON au.id = b.buyer_id
  LEFT JOIN public.profiles pr ON pr.user_id = b.buyer_id
  WHERE au.email IS NOT NULL
  ON CONFLICT (creator_id, email) DO UPDATE SET
    user_id = COALESCE(public.crm_contacts.user_id, EXCLUDED.user_id),
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(
      COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at),
      COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total := v_total + v_count;

  -- 4) Ticket buyers → source 'ticket' (any non-refunded ticket)
  INSERT INTO public.crm_contacts (creator_id, user_id, email, name, source, last_activity_at)
  SELECT
    p_creator_id,
    t.buyer_id,
    lower(au.email),
    COALESCE(
      NULLIF(btrim(pr.display_name), ''),
      NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
      pr.username
    ),
    'ticket',
    t.last_at
  FROM (
    SELECT tk.buyer_id, MAX(tk.created_at) AS last_at
    FROM public.tickets tk
    WHERE tk.creator_id = p_creator_id AND tk.status <> 'refunded'
    GROUP BY tk.buyer_id
  ) t
  JOIN auth.users au ON au.id = t.buyer_id
  LEFT JOIN public.profiles pr ON pr.user_id = t.buyer_id
  WHERE au.email IS NOT NULL
  ON CONFLICT (creator_id, email) DO UPDATE SET
    user_id = COALESCE(public.crm_contacts.user_id, EXCLUDED.user_id),
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(
      COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at),
      COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total := v_total + v_count;

  -- 5) Booking inquiries → source 'booking'
  --    public_booking_inquiries has no creator_id: it is keyed by
  --    artist_slug, which maps to the creator's profiles.username.
  INSERT INTO public.crm_contacts (creator_id, email, name, source, last_activity_at)
  SELECT DISTINCT ON (lower(bi.contact_email))
    p_creator_id,
    lower(bi.contact_email),
    NULLIF(btrim(bi.contact_name), ''),
    'booking',
    bi.created_at
  FROM public.public_booking_inquiries bi
  JOIN public.profiles pr
    ON pr.user_id = p_creator_id
   AND pr.username IS NOT NULL
   AND lower(pr.username) = lower(bi.artist_slug)
  WHERE bi.contact_email IS NOT NULL AND btrim(bi.contact_email) <> ''
  ORDER BY lower(bi.contact_email), bi.created_at DESC
  ON CONFLICT (creator_id, email) DO UPDATE SET
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(
      COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at),
      COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total := v_total + v_count;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_sync_contacts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_sync_contacts(uuid) TO authenticated;
