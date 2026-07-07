-- ============================================================
-- 20260707040000_levels_digest
-- Functional gamification (Skool retention loop) + daily email digest.
-- ALL ADDITIVE:
--   1. member_level(points)      — SQL mirror of the client level thresholds
--                                  (src/components/space/MemberXPBadge.tsx:
--                                   Lv1 ≥0, Lv2 ≥25, Lv3 ≥100, Lv4 ≥300, Lv5 ≥1000)
--   2. Level-up notifications    — SECURITY DEFINER trigger on member_points
--                                  AFTER INSERT (never-block, deduped per level)
--   3. creator_spaces.min_post_level — "Who can post" creator control,
--                                  enforced by extending the community_posts
--                                  INSERT policy (every existing clause from
--                                  20260706153000 is preserved verbatim)
--   4. notification_preferences.daily_digest_email — digest opt-out (reuses
--                                  the EXISTING email-prefs table + RLS from
--                                  20260304202323; own-row policies apply)
--   5. pg_cron job 'notification-digest' — daily call of the new
--                                  notification-digest edge function, following
--                                  the 20260706120000_automation_heartbeat
--                                  precedent (net.http_post + vault secret
--                                  'email_queue_service_role_key')
--
-- No new tables — new columns land on tables whose RLS already scopes them
-- (creator_spaces: public SELECT + owner-only writes; notification_preferences:
-- own-row SELECT/INSERT/UPDATE). No DROPs of tables/columns/data. The single
-- DROP POLICY recreates the current policy with its ORIGINAL condition AND the
-- added level check (policy drops don't touch data).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Level thresholds — EXACT mirror of MemberXPBadge.tsx LEVELS
--    (Newcomer 0 / Active 25 / Contributor 100 / Champion 300 / Legend 1000).
--    If the client thresholds ever change, change them here too.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.member_level(_points integer)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(_points, 0) >= 1000 THEN 5
    WHEN COALESCE(_points, 0) >= 300  THEN 4
    WHEN COALESCE(_points, 0) >= 100  THEN 3
    WHEN COALESCE(_points, 0) >= 25   THEN 2
    ELSE 1
  END;
$$;

-- Supports the per-(user, creator) totals the trigger and policy helper sum.
CREATE INDEX IF NOT EXISTS idx_member_points_user_creator
  ON public.member_points (user_id, creator_id);

-- ─────────────────────────────────────────────────────────────
-- 2. Level-up notification — AFTER INSERT on member_points.
--    member_points is written ONLY by SECURITY DEFINER award triggers
--    (20260706133000 + RSVP in 20260706200000), so this fires on every
--    legitimate award. Same design rules as 20260706150000: SECURITY
--    DEFINER, pinned search_path, EXCEPTION guard so a failure NEVER
--    blocks the points insert. Deduped per (user, community, level).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_level_up()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_total      integer;
  v_old_level  integer;
  v_new_level  integer;
  v_space_name text;
BEGIN
  BEGIN
    -- Only positive awards can cross a threshold upward.
    IF COALESCE(NEW.points, 0) <= 0 THEN
      RETURN NEW;
    END IF;

    -- AFTER INSERT: the SUM already includes NEW.points.
    SELECT COALESCE(SUM(points), 0)::integer INTO v_total
    FROM public.member_points
    WHERE user_id = NEW.user_id
      AND creator_id = NEW.creator_id;

    v_old_level := public.member_level(v_total - NEW.points);
    v_new_level := public.member_level(v_total);

    IF v_new_level <= v_old_level THEN
      RETURN NEW;
    END IF;

    -- Dedupe: one notification per level per community (re-computations,
    -- backfills, or races award the same level only once).
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.user_id
        AND type = 'level_up'
        AND reference_id = NEW.creator_id::text || ':' || v_new_level::text
    ) THEN
      RETURN NEW;
    END IF;

    SELECT NULLIF(TRIM(name), '') INTO v_space_name
    FROM public.creator_spaces WHERE creator_id = NEW.creator_id;
    IF v_space_name IS NULL THEN
      SELECT COALESCE(display_name, username) INTO v_space_name
      FROM public.profiles WHERE user_id = NEW.creator_id;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      NEW.user_id,
      'level_up',
      'Level Up! 🎉',
      'You reached Level ' || v_new_level || ' in ' || COALESCE(v_space_name, 'the community') || '! 🎉',
      NEW.creator_id,
      NEW.creator_id::text || ':' || v_new_level::text,
      '/community/' || NEW.creator_id::text || '/leaderboard'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[levels_digest] notify_on_level_up failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_level_up ON public.member_points;
CREATE TRIGGER trg_notify_level_up
  AFTER INSERT ON public.member_points
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_level_up();

-- ─────────────────────────────────────────────────────────────
-- 3. Creator control: minimum level to post.
--    creator_spaces RLS already covers the new column ("Anyone can view
--    spaces" SELECT lets members mirror the gate client-side; "Creators
--    manage own space" restricts writes to the owner).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.creator_spaces
  ADD COLUMN IF NOT EXISTS min_post_level integer NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE public.creator_spaces
    ADD CONSTRAINT creator_spaces_min_post_level_check
    CHECK (min_post_level BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.creator_spaces.min_post_level IS
  'Minimum member level (1-5, thresholds in public.member_level) required to create community posts. 1 = everyone. Enforced by the community_posts INSERT policy via public.meets_min_post_level.';

-- SECURITY DEFINER helper (same pattern as is_community_banned /
-- has_creator_access) so the policy check is not blocked by RLS and the
-- per-user points sum stays server-side.
CREATE OR REPLACE FUNCTION public.meets_min_post_level(_creator_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    auth.uid() = _creator_id  -- the space owner always may post
    OR COALESCE(
         (SELECT min_post_level FROM public.creator_spaces WHERE creator_id = _creator_id),
         1
       ) <= 1                 -- default / "everyone" — skip the sum entirely
    OR public.member_level(
         COALESCE(
           (SELECT SUM(points)::integer
            FROM public.member_points
            WHERE user_id = auth.uid()
              AND creator_id = _creator_id),
           0
         )
       ) >= COALESCE(
         (SELECT min_post_level FROM public.creator_spaces WHERE creator_id = _creator_id),
         1
       );
$$;

REVOKE ALL ON FUNCTION public.meets_min_post_level(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.meets_min_post_level(uuid) TO authenticated;

-- community_posts INSERT — CURRENT policy (20260706153000_moderation.sql):
--   WITH CHECK (auth.uid() = author_id AND NOT public.is_community_banned(creator_id))
-- Recreated with BOTH original clauses preserved verbatim + the level gate.
DROP POLICY IF EXISTS "Authors can create posts" ON public.community_posts;
CREATE POLICY "Authors can create posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND NOT public.is_community_banned(creator_id)
    AND public.meets_min_post_level(creator_id)
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Daily digest opt-out — reuses the EXISTING email-preferences
--    mechanism (notification_preferences, 20260304202323: own-row
--    SELECT/INSERT/UPDATE RLS), alongside weekly_report_email etc.
--    Toggle surfaced in Settings → Notifications.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS daily_digest_email boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.notification_preferences.daily_digest_email IS
  'Receive the once-daily unread-notifications summary email (notification-digest edge function). Default on; suppressed_emails still wins.';

-- ─────────────────────────────────────────────────────────────
-- 5. Cron: notification-digest daily at 15:00 UTC.
--    Same precedent as 20260706120000_automation_heartbeat: pg_cron +
--    net.http_post with the vault-stored service_role key
--    ('email_queue_service_role_key'). Until that secret exists the job
--    fires with a null Authorization header and the function rejects the
--    call (401/403) — nothing breaks, the digest just stays inert.
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'email_queue_service_role_key') THEN
    RAISE WARNING 'Vault secret email_queue_service_role_key is missing — the notification-digest cron job will not authenticate until it is created. Run: SELECT vault.create_secret(''<service_role_key>'', ''email_queue_service_role_key'');';
  END IF;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('notification-digest');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'notification-digest',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/notification-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
