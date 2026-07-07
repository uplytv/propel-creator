-- ═══════════════════════════════════════════════════════════════════════════
-- Course depth (Kajabi parity): drip scheduling, quizzes, resume position.
--
-- ADDITIVE ONLY — backward compatible by construction:
--   * classroom_modules.drip_days is NULL everywhere after this migration, and
--     the extended SELECT policies short-circuit on `drip_days IS NULL` back to
--     the EXACT tier-gating condition from 20260706210000 (which itself
--     short-circuits back to 20260611160000 when min_tier_rank IS NULL).
--   * has_creator_access / has_tier_access are NOT modified. No drops of
--     tables or columns, no data destroyed. Owner CRUD policies untouched.
--   * is_free content stays free (is_free still short-circuits first).
--   * New tables (lesson_quizzes, quiz_questions, quiz_attempts,
--     lesson_progress) ship WITH RLS in this same migration.
--
-- Quiz answer-key security model: quiz_questions.correct_index is NEVER
-- readable by members — the table has no member SELECT policy at all. Members
-- fetch questions through get_quiz_questions() (SECURITY DEFINER, strips
-- correct_index) and submit through grade_quiz_attempt() (SECURITY DEFINER,
-- grades server-side, inserts the attempt as owner — quiz_attempts has no
-- INSERT policy, so clients cannot forge passed=true).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DRIP SCHEDULING
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.classroom_modules
  ADD COLUMN IF NOT EXISTS drip_days integer;

DO $$ BEGIN
  ALTER TABLE public.classroom_modules
    ADD CONSTRAINT classroom_modules_drip_days_check
    CHECK (drip_days IS NULL OR drip_days >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.classroom_modules.drip_days IS
  'Unlock N days after the member joined the community. NULL = available immediately (legacy behavior). Only enforced on paid modules — is_free content stays free.';

-- When did the calling user "join" this creator? Earliest of:
--   * community_members.joined_at   (free-join roster)
--   * member_subscriptions.created_at (active/trialing paid sub)
--   * access_grants.granted_at      (unrevoked community grant)
-- These are exactly the three access paths has_creator_access accepts, so any
-- member who passes has_creator_access has a non-NULL member-since date.
-- (community_members carries joined_at, not created_at — that is its
-- row-creation timestamp.)
CREATE OR REPLACE FUNCTION public.my_member_since(p_creator_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MIN(j.since) FROM (
    SELECT cm.joined_at AS since
    FROM public.community_members cm
    WHERE cm.user_id = auth.uid() AND cm.creator_id = p_creator_id
    UNION ALL
    SELECT ms.created_at
    FROM public.member_subscriptions ms
    WHERE ms.member_id = auth.uid()
      AND ms.creator_id = p_creator_id
      AND ms.status IN ('active', 'trialing')
    UNION ALL
    SELECT ag.granted_at
    FROM public.access_grants ag
    JOIN public.creator_spaces cs ON cs.id = ag.resource_id
    WHERE ag.user_id = auth.uid()
      AND ag.revoked_at IS NULL
      AND ag.resource_type = 'community'
      AND cs.creator_id = p_creator_id
  ) j;
$$;

REVOKE ALL ON FUNCTION public.my_member_since(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.my_member_since(uuid) TO authenticated;

-- True when the content is not dripped, the caller is the creator, or the
-- caller's member-since date is at least drip_days old.
CREATE OR REPLACE FUNCTION public.has_drip_unlocked(p_creator_id uuid, p_drip_days integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_drip_days IS NULL
    OR p_drip_days <= 0
    -- the creator always sees everything
    OR auth.uid() = p_creator_id
    -- member joined long enough ago (NULL member-since → NULL → falsy)
    OR (public.my_member_since(p_creator_id) + make_interval(days => p_drip_days)) <= now();
$$;

REVOKE ALL ON FUNCTION public.has_drip_unlocked(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.has_drip_unlocked(uuid, integer) TO authenticated;

-- Lessons inherit their module's drip window. SECURITY DEFINER so the module
-- row is read bypassing RLS (a drip-locked module is invisible to the member —
-- an RLS-scoped subquery would evaluate to "no module → unlocked", leaking the
-- lessons). Unknown module → true (never lock content by accident).
CREATE OR REPLACE FUNCTION public.has_module_drip_unlocked(p_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT m.drip_days IS NULL OR public.has_drip_unlocked(m.creator_id, m.drip_days)
    FROM public.classroom_modules m
    WHERE m.id = p_module_id
  ), true);
$$;

REVOKE ALL ON FUNCTION public.has_module_drip_unlocked(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_module_drip_unlocked(uuid) TO authenticated;

-- Extend the classroom SELECT policies — same additive shape tier gating used.
-- Prior condition (20260706210000), preserved verbatim as the base:
--   is_free OR ( has_creator_access(creator_id)
--                AND (min_tier_rank IS NULL OR has_tier_access(creator_id, min_tier_rank)) )
-- New: the paid branch additionally requires the drip window to have elapsed:
--   ... AND (drip_days IS NULL OR has_drip_unlocked(creator_id, drip_days))
-- With drip_days NULL (all existing rows) this evaluates to exactly the
-- previous condition. Owner CRUD policies ("Creators manage …") untouched.

DROP POLICY IF EXISTS "View free or accessible modules" ON public.classroom_modules;
CREATE POLICY "View free or accessible modules"
  ON public.classroom_modules FOR SELECT TO authenticated
  USING (
    is_free
    OR (
      public.has_creator_access(creator_id)
      AND (min_tier_rank IS NULL OR public.has_tier_access(creator_id, min_tier_rank))
      AND (drip_days IS NULL OR public.has_drip_unlocked(creator_id, drip_days))
    )
  );

DROP POLICY IF EXISTS "View free or accessible lessons" ON public.classroom_lessons;
CREATE POLICY "View free or accessible lessons"
  ON public.classroom_lessons FOR SELECT TO authenticated
  USING (
    is_free
    OR (
      public.has_creator_access(creator_id)
      AND (min_tier_rank IS NULL OR public.has_tier_access(creator_id, min_tier_rank))
      AND public.has_module_drip_unlocked(module_id)
    )
  );

-- Drip-locked modules are (correctly) invisible under RLS, so the member UX
-- needs a teaser list: title + unlock date only, no lesson content. SECURITY
-- DEFINER; returns rows ONLY for callers who already pass the access + tier
-- checks (i.e. the module would be visible were it not for drip).
CREATE OR REPLACE FUNCTION public.my_drip_locked_modules(p_creator_id uuid)
RETURNS TABLE(
  module_id uuid,
  title text,
  description text,
  cover_image_url text,
  drip_days integer,
  unlock_at timestamptz,
  lesson_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.title,
    m.description,
    m.cover_image_url,
    m.drip_days,
    public.my_member_since(p_creator_id) + make_interval(days => m.drip_days) AS unlock_at,
    (SELECT COUNT(*) FROM public.classroom_lessons l WHERE l.module_id = m.id) AS lesson_count
  FROM public.classroom_modules m
  WHERE m.creator_id = p_creator_id
    AND auth.uid() IS NOT NULL
    AND auth.uid() <> p_creator_id
    AND m.is_free = false
    AND m.drip_days IS NOT NULL
    AND public.has_creator_access(p_creator_id)
    AND (m.min_tier_rank IS NULL OR public.has_tier_access(p_creator_id, m.min_tier_rank))
    AND NOT COALESCE(public.has_drip_unlocked(p_creator_id, m.drip_days), false)
  ORDER BY m.position;
$$;

REVOKE ALL ON FUNCTION public.my_drip_locked_modules(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.my_drip_locked_modules(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. QUIZZES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES public.classroom_lessons(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  pass_pct integer NOT NULL DEFAULT 70 CHECK (pass_pct BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL CHECK (
    jsonb_typeof(options) = 'array'
    AND jsonb_array_length(options) BETWEEN 2 AND 6
  ),
  correct_index integer NOT NULL CHECK (correct_index >= 0 AND correct_index <= 5),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_questions_correct_in_range CHECK (correct_index < jsonb_array_length(options))
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score_pct integer NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions (quiz_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user ON public.quiz_attempts (quiz_id, user_id, created_at DESC);

COMMENT ON COLUMN public.quiz_questions.correct_index IS
  'Answer key. NEVER member-readable: quiz_questions has no member SELECT policy — members fetch questions via get_quiz_questions() (strips this column) and are graded via grade_quiz_attempt().';
COMMENT ON COLUMN public.quiz_attempts.answers IS
  'jsonb object mapping question_id -> chosen option index, as submitted to grade_quiz_attempt().';

ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- lesson_quizzes: creator CRUD; members may see the quiz shell (pass_pct — no
-- answers live here) exactly when they can see the lesson (the subquery runs
-- under the caller's classroom_lessons RLS, so free/tier/drip all apply).
DROP POLICY IF EXISTS "Creators manage own quizzes" ON public.lesson_quizzes;
CREATE POLICY "Creators manage own quizzes"
  ON public.lesson_quizzes FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.classroom_lessons l
      WHERE l.id = lesson_id AND l.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members view quizzes on accessible lessons" ON public.lesson_quizzes;
CREATE POLICY "Members view quizzes on accessible lessons"
  ON public.lesson_quizzes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.classroom_lessons l WHERE l.id = lesson_quizzes.lesson_id)
  );

-- quiz_questions: creator ONLY. Deliberately no member SELECT policy — the
-- answer key (correct_index) must never be readable via the table.
DROP POLICY IF EXISTS "Creators manage own quiz questions" ON public.quiz_questions;
CREATE POLICY "Creators manage own quiz questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.lesson_quizzes z WHERE z.id = quiz_id AND z.creator_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.lesson_quizzes z WHERE z.id = quiz_id AND z.creator_id = auth.uid())
  );

-- quiz_attempts: read-only to users (own) and creators (their quizzes).
-- Deliberately no INSERT/UPDATE/DELETE policies — the ONLY write path is
-- grade_quiz_attempt() (SECURITY DEFINER), so a client can never forge a pass.
DROP POLICY IF EXISTS "Users view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users view own quiz attempts"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators view attempts on own quizzes" ON public.quiz_attempts;
CREATE POLICY "Creators view attempts on own quizzes"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.lesson_quizzes z WHERE z.id = quiz_id AND z.creator_id = auth.uid())
  );

-- Mirrors the classroom_lessons SELECT policy (free OR creator OR
-- access+tier+drip) for use inside SECURITY DEFINER quiz functions, where the
-- caller's RLS no longer applies.
CREATE OR REPLACE FUNCTION public.can_access_lesson(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_lessons l
    WHERE l.id = p_lesson_id
      AND (
        l.is_free
        OR l.creator_id = auth.uid()
        OR (
          public.has_creator_access(l.creator_id)
          AND (l.min_tier_rank IS NULL OR public.has_tier_access(l.creator_id, l.min_tier_rank))
          AND public.has_module_drip_unlocked(l.module_id)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_lesson(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO authenticated;

-- Member-safe question fetch: everything EXCEPT correct_index.
CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question text, options jsonb, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.quiz_id, q.question, q.options, q.position AS sort_order
  FROM public.quiz_questions q
  JOIN public.lesson_quizzes z ON z.id = q.quiz_id
  WHERE q.quiz_id = p_quiz_id
    AND auth.uid() IS NOT NULL
    AND public.can_access_lesson(z.lesson_id)
  ORDER BY q.position ASC, q.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_questions(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(uuid) TO authenticated;

-- Server-side grading. p_answers is a jsonb object {question_id: chosen_index}.
-- Inserts the attempt (as definer — no client INSERT path exists) and returns
-- score/passed plus per-question correctness. The answer key itself is never
-- returned — only whether each answer was right.
CREATE OR REPLACE FUNCTION public.grade_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson_id uuid;
  v_pass_pct integer;
  v_total integer := 0;
  v_correct integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_choice integer;
  v_raw text;
  v_score integer;
  v_passed boolean;
  r RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT z.lesson_id, z.pass_pct INTO v_lesson_id, v_pass_pct
  FROM public.lesson_quizzes z WHERE z.id = p_quiz_id;
  IF v_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  IF NOT public.can_access_lesson(v_lesson_id) THEN
    RAISE EXCEPTION 'No access to this lesson';
  END IF;

  FOR r IN
    SELECT q.id, q.correct_index
    FROM public.quiz_questions q
    WHERE q.quiz_id = p_quiz_id
    ORDER BY q.position ASC, q.created_at ASC
  LOOP
    v_total := v_total + 1;
    v_raw := COALESCE(p_answers, '{}'::jsonb) ->> r.id::text;
    v_choice := CASE WHEN v_raw ~ '^\d{1,2}$' THEN v_raw::integer ELSE NULL END;
    IF v_choice IS NOT NULL AND v_choice = r.correct_index THEN
      v_correct := v_correct + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('question_id', r.id, 'chosen', v_choice, 'correct', true));
    ELSE
      v_results := v_results || jsonb_build_array(jsonb_build_object('question_id', r.id, 'chosen', v_choice, 'correct', false));
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Quiz has no questions';
  END IF;

  v_score := ROUND(100.0 * v_correct / v_total)::integer;
  v_passed := v_score >= v_pass_pct;

  INSERT INTO public.quiz_attempts (quiz_id, user_id, score_pct, passed, answers)
  VALUES (p_quiz_id, auth.uid(), v_score, v_passed, COALESCE(p_answers, '{}'::jsonb));

  RETURN jsonb_build_object(
    'score_pct', v_score,
    'passed', v_passed,
    'total', v_total,
    'correct', v_correct,
    'pass_pct', v_pass_pct,
    'results', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grade_quiz_attempt(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.grade_quiz_attempt(uuid, jsonb) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RESUME POSITION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.classroom_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position_seconds integer NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, user_id)
);

COMMENT ON TABLE public.lesson_progress IS
  'Last playback position per user per lesson, written throttled (~10s) by the player. Powers "Resume at M:SS".';

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users manage own lesson progress"
  ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Re-assert RLS idempotently (no-table-without-RLS rule).
ALTER TABLE public.classroom_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_lessons ENABLE ROW LEVEL SECURITY;
