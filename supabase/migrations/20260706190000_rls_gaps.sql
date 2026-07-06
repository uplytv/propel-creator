-- ============================================================
-- Phase 2 Security Hardening: RLS gaps
-- ============================================================
-- Audit (2026-07-06) of all 505 tables in the live schema
-- (src/integrations/supabase/types.ts) vs supabase/migrations
-- found 3 tables with NO "ENABLE ROW LEVEL SECURITY" anywhere:
--
--   1. boost_toast_events  (boost telemetry log)
--   2. comment_reports     (reports against short_comments)
--   3. short_comments      (comments on shorts)
--
-- None of these tables are created by any migration in this repo
-- (they were created directly on the live database), so every
-- statement below is guarded with to_regclass() and is a no-op on
-- databases where the table does not exist. All statements are
-- additive and idempotent.
--
-- Without RLS these tables are fully readable AND writable by
-- anyone holding the public anon key via PostgREST. That is a P0.
-- ============================================================

-- ------------------------------------------------------------
-- 1. boost_toast_events
--    Columns: id, boost_key, boost_state, event_name, route, via,
--             content_id, content_type, creator_id, user_id, created_at
--    Usage: client-side telemetry event log (no reads in app code).
--    Least privilege: authenticated users may insert rows attributed
--    to themselves; users read their own rows; creators read events
--    about their own content. No public read, no update/delete.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.boost_toast_events') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.boost_toast_events ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'boost_toast_events'
        AND policyname = 'Users insert own boost toast events'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "Users insert own boost toast events"
        ON public.boost_toast_events FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
      $pol$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'boost_toast_events'
        AND policyname = 'Users and creators read own boost toast events'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "Users and creators read own boost toast events"
        ON public.boost_toast_events FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() OR creator_id = auth.uid())
      $pol$;
    END IF;
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 2. comment_reports
--    Columns: id, comment_id -> short_comments(id), reporter_id,
--             reason, details, status, created_at
--    Usage: no app call sites yet (moderation reports for shorts).
--    Least privilege: authenticated users may file a report as
--    themselves and read back their own reports. Status changes /
--    moderation happen via service role only.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.comment_reports') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'comment_reports'
        AND policyname = 'Users file own comment reports'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "Users file own comment reports"
        ON public.comment_reports FOR INSERT
        TO authenticated
        WITH CHECK (reporter_id = auth.uid())
      $pol$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'comment_reports'
        AND policyname = 'Users read own comment reports'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "Users read own comment reports"
        ON public.comment_reports FOR SELECT
        TO authenticated
        USING (reporter_id = auth.uid())
      $pol$;
    END IF;
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 3. short_comments
--    Columns: id, short_id, user_id, body, source, is_hidden,
--             hidden_at, hidden_by, like_count, created_at
--    Usage: no app call sites yet (shorts comments; /shorts feed is
--    post-launch). Least privilege that keeps the obvious feature
--    working: everyone reads non-hidden comments, authors read their
--    own (even when hidden), authenticated users insert as
--    themselves, authors update/delete their own rows. Moderation
--    (is_hidden/hidden_by) via service role.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.short_comments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.short_comments ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'short_comments'
        AND policyname = 'Anyone reads visible short comments'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "Anyone reads visible short comments"
        ON public.short_comments FOR SELECT
        USING (is_hidden = false OR user_id = auth.uid())
      $pol$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'short_comments'
        AND policyname = 'Users insert own short comments'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "Users insert own short comments"
        ON public.short_comments FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
      $pol$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'short_comments'
        AND policyname = 'Users update own short comments'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "Users update own short comments"
        ON public.short_comments FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())
      $pol$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'short_comments'
        AND policyname = 'Users delete own short comments'
    ) THEN
      EXECUTE $pol$
        CREATE POLICY "Users delete own short comments"
        ON public.short_comments FOR DELETE
        TO authenticated
        USING (user_id = auth.uid())
      $pol$;
    END IF;
  END IF;
END
$$;
