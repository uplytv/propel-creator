-- Batch: 20260707010000..20260707040000
ALTER TABLE public.classroom_modules ADD COLUMN IF NOT EXISTS drip_days integer;
DO $$ BEGIN
  ALTER TABLE public.classroom_modules ADD CONSTRAINT classroom_modules_drip_days_check CHECK (drip_days IS NULL OR drip_days >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.my_member_since(p_creator_id uuid)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT MIN(j.since) FROM (
    SELECT cm.joined_at AS since FROM public.community_members cm WHERE cm.user_id = auth.uid() AND cm.creator_id = p_creator_id
    UNION ALL
    SELECT ms.created_at FROM public.member_subscriptions ms WHERE ms.member_id = auth.uid() AND ms.creator_id = p_creator_id AND ms.status IN ('active','trialing')
    UNION ALL
    SELECT ag.granted_at FROM public.access_grants ag JOIN public.creator_spaces cs ON cs.id = ag.resource_id
    WHERE ag.user_id = auth.uid() AND ag.revoked_at IS NULL AND ag.resource_type = 'community' AND cs.creator_id = p_creator_id
  ) j;
$$;
REVOKE ALL ON FUNCTION public.my_member_since(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.my_member_since(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_drip_unlocked(p_creator_id uuid, p_drip_days integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_drip_days IS NULL OR p_drip_days <= 0 OR auth.uid() = p_creator_id
    OR (public.my_member_since(p_creator_id) + make_interval(days => p_drip_days)) <= now();
$$;
REVOKE ALL ON FUNCTION public.has_drip_unlocked(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.has_drip_unlocked(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_module_drip_unlocked(p_module_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT m.drip_days IS NULL OR public.has_drip_unlocked(m.creator_id, m.drip_days)
    FROM public.classroom_modules m WHERE m.id = p_module_id), true);
$$;
REVOKE ALL ON FUNCTION public.has_module_drip_unlocked(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_module_drip_unlocked(uuid) TO authenticated;

DROP POLICY IF EXISTS "View free or accessible modules" ON public.classroom_modules;
CREATE POLICY "View free or accessible modules" ON public.classroom_modules FOR SELECT TO authenticated
  USING (is_free OR (public.has_creator_access(creator_id) AND (min_tier_rank IS NULL OR public.has_tier_access(creator_id, min_tier_rank)) AND (drip_days IS NULL OR public.has_drip_unlocked(creator_id, drip_days))));

DROP POLICY IF EXISTS "View free or accessible lessons" ON public.classroom_lessons;
CREATE POLICY "View free or accessible lessons" ON public.classroom_lessons FOR SELECT TO authenticated
  USING (is_free OR (public.has_creator_access(creator_id) AND (min_tier_rank IS NULL OR public.has_tier_access(creator_id, min_tier_rank)) AND public.has_module_drip_unlocked(module_id)));

CREATE OR REPLACE FUNCTION public.my_drip_locked_modules(p_creator_id uuid)
RETURNS TABLE(module_id uuid, title text, description text, cover_image_url text, drip_days integer, unlock_at timestamptz, lesson_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.title, m.description, m.cover_image_url, m.drip_days,
    public.my_member_since(p_creator_id) + make_interval(days => m.drip_days) AS unlock_at,
    (SELECT COUNT(*) FROM public.classroom_lessons l WHERE l.module_id = m.id) AS lesson_count
  FROM public.classroom_modules m
  WHERE m.creator_id = p_creator_id AND auth.uid() IS NOT NULL AND auth.uid() <> p_creator_id
    AND m.is_free = false AND m.drip_days IS NOT NULL
    AND public.has_creator_access(p_creator_id)
    AND (m.min_tier_rank IS NULL OR public.has_tier_access(p_creator_id, m.min_tier_rank))
    AND NOT COALESCE(public.has_drip_unlocked(p_creator_id, m.drip_days), false)
  ORDER BY m.position;
$$;
REVOKE ALL ON FUNCTION public.my_drip_locked_modules(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.my_drip_locked_modules(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES public.classroom_lessons(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  pass_pct integer NOT NULL DEFAULT 70 CHECK (pass_pct BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_quizzes TO authenticated;
GRANT ALL ON public.lesson_quizzes TO service_role;

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  correct_index integer NOT NULL CHECK (correct_index >= 0 AND correct_index <= 5),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_questions_correct_in_range CHECK (correct_index < jsonb_array_length(options))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score_pct integer NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions (quiz_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user ON public.quiz_attempts (quiz_id, user_id, created_at DESC);

ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators manage own quizzes" ON public.lesson_quizzes;
CREATE POLICY "Creators manage own quizzes" ON public.lesson_quizzes FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id AND EXISTS (SELECT 1 FROM public.classroom_lessons l WHERE l.id = lesson_id AND l.creator_id = auth.uid()));

DROP POLICY IF EXISTS "Members view quizzes on accessible lessons" ON public.lesson_quizzes;
CREATE POLICY "Members view quizzes on accessible lessons" ON public.lesson_quizzes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classroom_lessons l WHERE l.id = lesson_quizzes.lesson_id));

DROP POLICY IF EXISTS "Creators manage own quiz questions" ON public.quiz_questions;
CREATE POLICY "Creators manage own quiz questions" ON public.quiz_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_quizzes z WHERE z.id = quiz_id AND z.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lesson_quizzes z WHERE z.id = quiz_id AND z.creator_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users view own quiz attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators view attempts on own quizzes" ON public.quiz_attempts;
CREATE POLICY "Creators view attempts on own quizzes" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_quizzes z WHERE z.id = quiz_id AND z.creator_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.can_access_lesson(p_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classroom_lessons l WHERE l.id = p_lesson_id
    AND (l.is_free OR l.creator_id = auth.uid()
      OR (public.has_creator_access(l.creator_id)
        AND (l.min_tier_rank IS NULL OR public.has_tier_access(l.creator_id, l.min_tier_rank))
        AND public.has_module_drip_unlocked(l.module_id))));
$$;
REVOKE ALL ON FUNCTION public.can_access_lesson(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question text, options jsonb, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.quiz_id, q.question, q.options, q.position AS sort_order
  FROM public.quiz_questions q JOIN public.lesson_quizzes z ON z.id = q.quiz_id
  WHERE q.quiz_id = p_quiz_id AND auth.uid() IS NOT NULL AND public.can_access_lesson(z.lesson_id)
  ORDER BY q.position ASC, q.created_at ASC;
$$;
REVOKE ALL ON FUNCTION public.get_quiz_questions(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.grade_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lesson_id uuid; v_pass_pct integer;
  v_total integer := 0; v_correct integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_choice integer; v_raw text;
  v_score integer; v_passed boolean; r RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT z.lesson_id, z.pass_pct INTO v_lesson_id, v_pass_pct FROM public.lesson_quizzes z WHERE z.id = p_quiz_id;
  IF v_lesson_id IS NULL THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF NOT public.can_access_lesson(v_lesson_id) THEN RAISE EXCEPTION 'No access to this lesson'; END IF;
  FOR r IN SELECT q.id, q.correct_index FROM public.quiz_questions q WHERE q.quiz_id = p_quiz_id ORDER BY q.position ASC, q.created_at ASC LOOP
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
  IF v_total = 0 THEN RAISE EXCEPTION 'Quiz has no questions'; END IF;
  v_score := ROUND(100.0 * v_correct / v_total)::integer;
  v_passed := v_score >= v_pass_pct;
  INSERT INTO public.quiz_attempts (quiz_id, user_id, score_pct, passed, answers)
  VALUES (p_quiz_id, auth.uid(), v_score, v_passed, COALESCE(p_answers, '{}'::jsonb));
  RETURN jsonb_build_object('score_pct', v_score, 'passed', v_passed, 'total', v_total, 'correct', v_correct, 'pass_pct', v_pass_pct, 'results', v_results);
END; $$;
REVOKE ALL ON FUNCTION public.grade_quiz_attempt(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.grade_quiz_attempt(uuid, jsonb) TO authenticated;

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.classroom_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position_seconds integer NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users manage own lesson progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- === event_promoters ===
CREATE TABLE IF NOT EXISTS public.event_promoters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  promoter_user_id uuid,
  promoter_name text,
  promoter_email text,
  code text NOT NULL CHECK (code = upper(code) AND char_length(code) BETWEEN 3 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, code),
  CHECK (promoter_user_id IS NOT NULL OR promoter_name IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_promoters TO authenticated;
GRANT ALL ON public.event_promoters TO service_role;
CREATE INDEX IF NOT EXISTS idx_event_promoters_event ON public.event_promoters (event_id);
CREATE INDEX IF NOT EXISTS idx_event_promoters_user ON public.event_promoters (promoter_user_id) WHERE promoter_user_id IS NOT NULL;
ALTER TABLE public.event_promoters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event managers manage promoters" ON public.event_promoters FOR ALL TO authenticated
  USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "Promoters read own promoter rows" ON public.event_promoters FOR SELECT TO authenticated
  USING (auth.uid() = promoter_user_id);

CREATE TABLE IF NOT EXISTS public.event_promoter_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.event_promoters(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  tickets_count integer NOT NULL DEFAULT 0 CHECK (tickets_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_promoter_sales TO authenticated;
GRANT ALL ON public.event_promoter_sales TO service_role;
CREATE INDEX IF NOT EXISTS idx_event_promoter_sales_promoter ON public.event_promoter_sales (promoter_id);
CREATE INDEX IF NOT EXISTS idx_event_promoter_sales_event ON public.event_promoter_sales (event_id);
ALTER TABLE public.event_promoter_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers and promoters read attributed sales" ON public.event_promoter_sales FOR SELECT TO authenticated
  USING (public.can_manage_event(event_id) OR EXISTS (SELECT 1 FROM public.event_promoters p WHERE p.id = promoter_id AND p.promoter_user_id = auth.uid()));

-- === annual_tiers ===
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS price_yearly numeric,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text,
  ADD COLUMN IF NOT EXISTS welcome_message text;
DO $$ BEGIN
  ALTER TABLE public.subscription_tiers ADD CONSTRAINT subscription_tiers_price_yearly_positive CHECK (price_yearly IS NULL OR price_yearly > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscription_tiers ADD CONSTRAINT subscription_tiers_welcome_message_len CHECK (welcome_message IS NULL OR char_length(welcome_message) <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.notify_member_welcome() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg TEXT; v_creator_name TEXT;
BEGIN
  BEGIN
    IF NEW.status NOT IN ('active','trialing') THEN RETURN NEW; END IF;
    IF NEW.member_id = NEW.creator_id OR NEW.tier_id IS NULL THEN RETURN NEW; END IF;
    SELECT welcome_message INTO v_msg FROM public.subscription_tiers WHERE id = NEW.tier_id;
    IF v_msg IS NULL OR TRIM(v_msg) = '' THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id = NEW.member_id AND type = 'creator_welcome' AND actor_id = NEW.creator_id) THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, username) INTO v_creator_name FROM public.profiles WHERE user_id = NEW.creator_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (NEW.member_id, 'creator_welcome', 'A welcome from ' || COALESCE(v_creator_name, 'your creator') || ' 👋', LEFT(v_msg, 1000), NEW.creator_id, NEW.tier_id::text, '/community/' || NEW.creator_id::text || '/community');
  EXCEPTION WHEN OTHERS THEN RAISE WARNING '[annual_tiers] notify_member_welcome failed: %', SQLERRM;
  END; RETURN NEW;
END; $$;
DO $$ BEGIN
  IF to_regclass('public.member_subscriptions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_member_welcome ON public.member_subscriptions;
    CREATE TRIGGER trg_notify_member_welcome AFTER INSERT ON public.member_subscriptions FOR EACH ROW EXECUTE FUNCTION public.notify_member_welcome();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.notify_member_welcome_on_join() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tier_id UUID; v_msg TEXT; v_creator_name TEXT;
BEGIN
  BEGIN
    IF NEW.user_id = NEW.creator_id THEN RETURN NEW; END IF;
    SELECT st.id, st.welcome_message INTO v_tier_id, v_msg
    FROM public.member_subscriptions ms JOIN public.subscription_tiers st ON st.id = ms.tier_id
    WHERE ms.member_id = NEW.user_id AND ms.creator_id = NEW.creator_id AND ms.status IN ('active','trialing')
    ORDER BY ms.created_at DESC LIMIT 1;
    IF v_msg IS NULL OR TRIM(v_msg) = '' THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id = NEW.user_id AND type = 'creator_welcome' AND actor_id = NEW.creator_id) THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, username) INTO v_creator_name FROM public.profiles WHERE user_id = NEW.creator_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (NEW.user_id, 'creator_welcome', 'A welcome from ' || COALESCE(v_creator_name, 'your creator') || ' 👋', LEFT(v_msg, 1000), NEW.creator_id, v_tier_id::text, '/community/' || NEW.creator_id::text || '/community');
  EXCEPTION WHEN OTHERS THEN RAISE WARNING '[annual_tiers] notify_member_welcome_on_join failed: %', SQLERRM;
  END; RETURN NEW;
END; $$;
DO $$ BEGIN
  IF to_regclass('public.community_members') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_member_welcome_join ON public.community_members;
    CREATE TRIGGER trg_notify_member_welcome_join AFTER INSERT ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.notify_member_welcome_on_join();
  END IF;
END $$;

-- === levels_digest ===
CREATE OR REPLACE FUNCTION public.member_level(_points integer) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN COALESCE(_points, 0) >= 1000 THEN 5
    WHEN COALESCE(_points, 0) >= 300 THEN 4
    WHEN COALESCE(_points, 0) >= 100 THEN 3
    WHEN COALESCE(_points, 0) >= 25 THEN 2
    ELSE 1 END;
$$;

CREATE INDEX IF NOT EXISTS idx_member_points_user_creator ON public.member_points (user_id, creator_id);

CREATE OR REPLACE FUNCTION public.notify_on_level_up() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total integer; v_old_level integer; v_new_level integer; v_space_name text;
BEGIN
  BEGIN
    IF COALESCE(NEW.points, 0) <= 0 THEN RETURN NEW; END IF;
    SELECT COALESCE(SUM(points), 0)::integer INTO v_total FROM public.member_points WHERE user_id = NEW.user_id AND creator_id = NEW.creator_id;
    v_old_level := public.member_level(v_total - NEW.points);
    v_new_level := public.member_level(v_total);
    IF v_new_level <= v_old_level THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id = NEW.user_id AND type = 'level_up' AND reference_id = NEW.creator_id::text || ':' || v_new_level::text) THEN RETURN NEW; END IF;
    SELECT NULLIF(TRIM(name), '') INTO v_space_name FROM public.creator_spaces WHERE creator_id = NEW.creator_id;
    IF v_space_name IS NULL THEN SELECT COALESCE(display_name, username) INTO v_space_name FROM public.profiles WHERE user_id = NEW.creator_id; END IF;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (NEW.user_id, 'level_up', 'Level Up! 🎉', 'You reached Level ' || v_new_level || ' in ' || COALESCE(v_space_name, 'the community') || '! 🎉',
      NEW.creator_id, NEW.creator_id::text || ':' || v_new_level::text, '/community/' || NEW.creator_id::text || '/leaderboard');
  EXCEPTION WHEN OTHERS THEN RAISE WARNING '[levels_digest] notify_on_level_up failed: %', SQLERRM;
  END; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_level_up ON public.member_points;
CREATE TRIGGER trg_notify_level_up AFTER INSERT ON public.member_points FOR EACH ROW EXECUTE FUNCTION public.notify_on_level_up();

ALTER TABLE public.creator_spaces ADD COLUMN IF NOT EXISTS min_post_level integer NOT NULL DEFAULT 1;
DO $$ BEGIN
  ALTER TABLE public.creator_spaces ADD CONSTRAINT creator_spaces_min_post_level_check CHECK (min_post_level BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.meets_min_post_level(_creator_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = _creator_id
    OR COALESCE((SELECT min_post_level FROM public.creator_spaces WHERE creator_id = _creator_id), 1) <= 1
    OR public.member_level(COALESCE((SELECT SUM(points)::integer FROM public.member_points WHERE user_id = auth.uid() AND creator_id = _creator_id), 0))
       >= COALESCE((SELECT min_post_level FROM public.creator_spaces WHERE creator_id = _creator_id), 1);
$$;
REVOKE ALL ON FUNCTION public.meets_min_post_level(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.meets_min_post_level(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authors can create posts" ON public.community_posts;
CREATE POLICY "Authors can create posts" ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_community_banned(creator_id) AND public.meets_min_post_level(creator_id));

ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS daily_digest_email boolean NOT NULL DEFAULT true;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $$ BEGIN PERFORM cron.unschedule('notification-digest'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('notification-digest', '0 15 * * *', $q$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/notification-digest',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1), '')),
    body := '{}'::jsonb);
$q$);