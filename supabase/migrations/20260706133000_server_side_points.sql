-- Server-side leaderboard points: clients could INSERT into member_points with
-- only auth.uid() = user_id, i.e. any member could self-award unlimited points.
-- This migration removes all client write paths and awards points via
-- SECURITY DEFINER triggers on the authoritative events, using the exact
-- values the client used: post +5, comment +2, like +1, lesson_complete +10.

-- ============================================================
-- 1. Kill the client INSERT path (idempotent — 20260316105333
--    already dropped the policy on environments where it ran).
--    RLS is enabled with no INSERT policy => clients cannot insert.
-- ============================================================
DROP POLICY IF EXISTS "System can insert points" ON public.member_points;

-- ============================================================
-- 2. Dedupe support: source_id ties an award to the row that
--    earned it. The unique index makes repeat events (re-like of
--    the same post, duplicate lesson completion) award nothing.
--    NULLs (pre-existing rows) never collide.
-- ============================================================
ALTER TABLE public.member_points ADD COLUMN IF NOT EXISTS source_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS member_points_user_action_source_key
  ON public.member_points (user_id, action_type, source_id);

-- ============================================================
-- 3. Award triggers (SECURITY DEFINER: they insert into
--    member_points regardless of RLS; clients still cannot).
-- ============================================================

-- +5 for creating a community post
CREATE OR REPLACE FUNCTION public.award_points_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
  VALUES (NEW.author_id, NEW.creator_id, 'post', 5, NEW.id)
  ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_on_post ON public.community_posts;
CREATE TRIGGER award_points_on_post
  AFTER INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_post();

-- +2 for commenting on a post (creator resolved from the post)
CREATE OR REPLACE FUNCTION public.award_points_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.community_posts WHERE id = NEW.post_id;
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
    VALUES (NEW.author_id, v_creator_id, 'comment', 2, NEW.id)
    ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_on_comment ON public.community_comments;
CREATE TRIGGER award_points_on_comment
  AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_comment();

-- +1 for liking a post (same value/recipient the client used:
-- action_type 'like_received', awarded to the liker). source_id =
-- post_id, so like/unlike/re-like of the same post can't farm points.
CREATE OR REPLACE FUNCTION public.award_points_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.community_posts WHERE id = NEW.post_id;
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
    VALUES (NEW.user_id, v_creator_id, 'like_received', 1, NEW.post_id)
    ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_on_like ON public.community_post_likes;
CREATE TRIGGER award_points_on_like
  AFTER INSERT ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_like();

-- +10 for completing a lesson (creator resolved from the lesson;
-- lesson_completions has UNIQUE(lesson_id, user_id), and source_id =
-- lesson_id dedupes the award as well).
CREATE OR REPLACE FUNCTION public.award_points_on_lesson_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.classroom_lessons WHERE id = NEW.lesson_id;
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
    VALUES (NEW.user_id, v_creator_id, 'lesson_complete', 10, NEW.lesson_id)
    ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_on_lesson_completion ON public.lesson_completions;
CREATE TRIGGER award_points_on_lesson_completion
  AFTER INSERT ON public.lesson_completions
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_lesson_completion();

-- Leaderboard read path unchanged: "Anyone can view points" SELECT policy
-- on member_points stays as-is (useMemberPoints only selects user_id/points).
