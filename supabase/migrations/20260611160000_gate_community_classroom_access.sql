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
