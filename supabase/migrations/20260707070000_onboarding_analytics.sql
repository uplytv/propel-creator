-- ═══════════════════════════════════════════════════════════════════════════
-- Onboarding + course analytics — ADDITIVE ONLY.
--
--   1. profiles.phone / profiles.company_name — the trial modal's Step-1
--      answers persisted onto the creator's own profiles row. profiles SELECT
--      is owner-only (+ admins) since 20260316194931, and the public surface
--      is the column-enumerated profiles_public view, so neither new column
--      is ever exposed to other users. Existing owner-scoped INSERT/UPDATE
--      policies cover the new columns; RLS re-asserted idempotently below.
--
--   2. course_insights(p_creator_id) — owner-only per-lesson aggregates for
--      the classroom "Course insights" panel. SECURITY DEFINER, hard-guarded
--      by auth.uid() = p_creator_id. Returns counts/averages ONLY — no member
--      identities or per-member rows leave the database.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Trial Step-1 answers on the profile
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text;

COMMENT ON COLUMN public.profiles.phone IS
  'Contact phone from trial signup Step 1 (self-reported, unverified). Owner-readable only — profiles SELECT is auth.uid() = user_id; NOT in profiles_public.';
COMMENT ON COLUMN public.profiles.company_name IS
  'Company / brand name from trial signup Step 1. Owner-readable only — NOT in profiles_public.';

-- No-table-without-RLS rule: re-assert idempotently. The new columns are
-- governed by the existing owner-scoped policies ("Users can view own
-- profile" / "Users can update own profile").
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Owner-only course insights
-- ─────────────────────────────────────────────────────────────────────────────

-- Per-lesson engagement aggregates for a creator's classroom:
--   member_count       — distinct users on any of the three access paths
--                        has_creator_access accepts (community_members roster,
--                        active/trialing member_subscriptions, unrevoked
--                        community access_grants), excluding the creator.
--                        Repeated on every row; the "% of members" denominator.
--   completions        — lesson_completions count (creator's own excluded).
--   in_progress        — started-but-unfinished: lesson_progress rows with no
--                        matching lesson_completions row for that user+lesson.
--   has_quiz           — whether a lesson_quizzes row exists for the lesson.
--   quiz_takers        — distinct members with at least one quiz_attempts row.
--   avg_quiz_best_pct  — average over members of each member's best score_pct.
CREATE OR REPLACE FUNCTION public.course_insights(p_creator_id uuid)
RETURNS TABLE(
  module_id uuid,
  module_title text,
  module_position integer,
  lesson_id uuid,
  lesson_title text,
  lesson_position integer,
  member_count bigint,
  completions bigint,
  in_progress bigint,
  has_quiz boolean,
  quiz_takers bigint,
  avg_quiz_best_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hard owner guard — these aggregates are the creator's business data.
  IF auth.uid() IS NULL OR auth.uid() <> p_creator_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT COUNT(DISTINCT u.uid) AS n FROM (
      SELECT cm.user_id AS uid
      FROM public.community_members cm
      WHERE cm.creator_id = p_creator_id
      UNION
      SELECT ms.member_id
      FROM public.member_subscriptions ms
      WHERE ms.creator_id = p_creator_id AND ms.status IN ('active', 'trialing')
      UNION
      SELECT ag.user_id
      FROM public.access_grants ag
      JOIN public.creator_spaces cs ON cs.id = ag.resource_id
      WHERE ag.revoked_at IS NULL
        AND ag.resource_type = 'community'
        AND cs.creator_id = p_creator_id
    ) u
    WHERE u.uid <> p_creator_id
  )
  SELECT
    m.id,
    m.title,
    m.position,
    l.id,
    l.title,
    l.position,
    (SELECT mem.n FROM members mem),
    (SELECT COUNT(*)
       FROM public.lesson_completions lc
      WHERE lc.lesson_id = l.id
        AND lc.user_id <> p_creator_id),
    (SELECT COUNT(*)
       FROM public.lesson_progress lp
      WHERE lp.lesson_id = l.id
        AND lp.user_id <> p_creator_id
        AND NOT EXISTS (
          SELECT 1 FROM public.lesson_completions lc2
          WHERE lc2.lesson_id = lp.lesson_id AND lc2.user_id = lp.user_id
        )),
    (z.id IS NOT NULL),
    COALESCE(qa.takers, 0),
    qa.avg_best
  FROM public.classroom_lessons l
  JOIN public.classroom_modules m ON m.id = l.module_id
  LEFT JOIN public.lesson_quizzes z ON z.lesson_id = l.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS takers,
           ROUND(AVG(best.best_pct), 1) AS avg_best
    FROM (
      SELECT MAX(a.score_pct) AS best_pct
      FROM public.quiz_attempts a
      WHERE a.quiz_id = z.id AND a.user_id <> p_creator_id
      GROUP BY a.user_id
    ) best
  ) qa ON true
  WHERE l.creator_id = p_creator_id
  ORDER BY m.position ASC, l.position ASC, l.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.course_insights(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.course_insights(uuid) TO authenticated;
