-- ============================================================
-- 20260706200000_community_depth
-- Community depth (Skool/Circle parity), all ADDITIVE:
--   1. community_polls + community_poll_votes  (post polls, live results)
--   2. community_comments.parent_id            (one-level threaded replies)
--      + community_comment_likes               (comment hearts)
--      + reply notification (SECURITY DEFINER, never-block — same style as
--        20260706150000_notification_engine.sql)
--   3. community_event_rsvps                   (Going on calendar events)
--      + "+15 Attend an event" points trigger  (consistent with
--        20260706133000_server_side_points.sql)
--
-- Every new table ships with RLS in this same migration. Access reuses the
-- existing SECURITY DEFINER helpers:
--   * public.has_creator_access(creator_id)        — membership/paid access
--   * public.is_community_banned(creator_id)       — community bans
--   * public.is_banned_from_post_community(post_id)
-- No existing table, policy, trigger, or webhook is dropped or modified.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1a. community_polls — at most one poll per post, 2–6 options
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_polls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL UNIQUE REFERENCES public.community_posts(id) ON DELETE CASCADE,
  options    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_polls_options_shape CHECK (
    jsonb_typeof(options) = 'array'
    AND jsonb_array_length(options) BETWEEN 2 AND 6
  )
);

GRANT SELECT, INSERT, DELETE ON public.community_polls TO authenticated;
GRANT ALL ON public.community_polls TO service_role;

ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;

-- Read: everyone who can read the parent post (mirrors "View community posts
-- with access" from 20260611160000).
DROP POLICY IF EXISTS "View polls with post access" ON public.community_polls;
CREATE POLICY "View polls with post access"
  ON public.community_polls FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = community_polls.post_id
        AND (auth.uid() = p.author_id OR public.has_creator_access(p.creator_id))
    )
  );

-- Attach: only the post's author, and never while banned from that community.
DROP POLICY IF EXISTS "Post authors can attach polls" ON public.community_polls;
CREATE POLICY "Post authors can attach polls"
  ON public.community_polls FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = community_polls.post_id
        AND p.author_id = auth.uid()
    )
    AND NOT public.is_banned_from_post_community(post_id)
  );

-- Remove: the post author or the space creator (moderation parity with posts).
DROP POLICY IF EXISTS "Authors or creators can delete polls" ON public.community_polls;
CREATE POLICY "Authors or creators can delete polls"
  ON public.community_polls FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = community_polls.post_id
        AND (p.author_id = auth.uid() OR p.creator_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 1b. community_poll_votes — one vote per member per poll
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  option_index integer NOT NULL CHECK (option_index >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll
  ON public.community_poll_votes (poll_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_poll_votes TO authenticated;
GRANT ALL ON public.community_poll_votes TO service_role;

ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;

-- Read: everyone with post access (needed to render live result bars).
DROP POLICY IF EXISTS "View poll votes with post access" ON public.community_poll_votes;
CREATE POLICY "View poll votes with post access"
  ON public.community_poll_votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_polls cp
      JOIN public.community_posts p ON p.id = cp.post_id
      WHERE cp.id = community_poll_votes.poll_id
        AND (auth.uid() = p.author_id OR public.has_creator_access(p.creator_id))
    )
  );

-- Vote: members of that community only (has_creator_access covers the
-- creator, paid subs, access grants, and free-space roster), never while
-- banned, and the chosen option must exist on the poll.
DROP POLICY IF EXISTS "Members can vote in polls" ON public.community_poll_votes;
CREATE POLICY "Members can vote in polls"
  ON public.community_poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.community_polls cp
      JOIN public.community_posts p ON p.id = cp.post_id
      WHERE cp.id = community_poll_votes.poll_id
        AND community_poll_votes.option_index < jsonb_array_length(cp.options)
        AND public.has_creator_access(p.creator_id)
        AND NOT public.is_community_banned(p.creator_id)
    )
  );

-- Change vote: the upsert path (ON CONFLICT (poll_id, user_id) DO UPDATE).
DROP POLICY IF EXISTS "Voters can change own vote" ON public.community_poll_votes;
CREATE POLICY "Voters can change own vote"
  ON public.community_poll_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.community_polls cp
      WHERE cp.id = community_poll_votes.poll_id
        AND community_poll_votes.option_index < jsonb_array_length(cp.options)
    )
  );

DROP POLICY IF EXISTS "Voters can remove own vote" ON public.community_poll_votes;
CREATE POLICY "Voters can remove own vote"
  ON public.community_poll_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2a. Threaded replies — additive self-FK on community_comments
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_community_comments_parent
  ON public.community_comments (parent_id)
  WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN public.community_comments.parent_id IS
  'One-level threading: NULL = top-level comment, set = reply to that comment. Existing INSERT/SELECT/DELETE policies apply unchanged.';

-- ─────────────────────────────────────────────────────────────
-- 2b. community_comment_likes — hearts on comments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_comment_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_comment_likes_comment
  ON public.community_comment_likes (comment_id);

GRANT SELECT, INSERT, DELETE ON public.community_comment_likes TO authenticated;
GRANT ALL ON public.community_comment_likes TO service_role;

ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

-- Read: everyone who can read the comment (mirrors "View comments with access").
DROP POLICY IF EXISTS "View comment likes with access" ON public.community_comment_likes;
CREATE POLICY "View comment likes with access"
  ON public.community_comment_likes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_comments c
      JOIN public.community_posts p ON p.id = c.post_id
      WHERE c.id = community_comment_likes.comment_id
        AND (auth.uid() = c.author_id OR public.has_creator_access(p.creator_id))
    )
  );

-- Like: members with access, never while banned from that community.
DROP POLICY IF EXISTS "Members can like comments" ON public.community_comment_likes;
CREATE POLICY "Members can like comments"
  ON public.community_comment_likes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.community_comments c
      JOIN public.community_posts p ON p.id = c.post_id
      WHERE c.id = community_comment_likes.comment_id
        AND public.has_creator_access(p.creator_id)
        AND NOT public.is_community_banned(p.creator_id)
    )
  );

DROP POLICY IF EXISTS "Users can unlike comments" ON public.community_comment_likes;
CREATE POLICY "Users can unlike comments"
  ON public.community_comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2c. Reply notification — notify the replied-to comment author.
--     Same design rules as 20260706150000: SECURITY DEFINER, pinned
--     search_path, EXCEPTION guard so a failure NEVER blocks the insert.
--     The existing notify_on_community_comment trigger still fires on every
--     comment INSERT (parent-post author keeps getting "New Comment"); this
--     trigger ONLY adds a "New Reply" to the parent-comment author, and skips
--     when that author is the replier or already covered by the post-author
--     notification.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_community_reply()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_parent_author UUID;
  v_post_author   UUID;
  v_replier_name  TEXT;
BEGIN
  BEGIN
    IF NEW.parent_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT author_id INTO v_parent_author
    FROM public.community_comments WHERE id = NEW.parent_id;

    SELECT author_id INTO v_post_author
    FROM public.community_posts WHERE id = NEW.post_id;

    -- Skip self-replies; skip the post author (they already receive
    -- "community_comment" from the existing trigger for this same insert).
    IF v_parent_author IS NULL
       OR v_parent_author = NEW.author_id
       OR v_parent_author = v_post_author THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, 'Someone') INTO v_replier_name
    FROM public.profiles WHERE user_id = NEW.author_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
    VALUES (
      v_parent_author,
      'community_reply',
      'New Reply',
      COALESCE(v_replier_name, 'Someone') || ' replied to your comment: "' || LEFT(NEW.body, 80) || '"',
      NEW.author_id,
      NEW.post_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[community_depth] notify_on_community_reply failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_community_reply ON public.community_comments;
CREATE TRIGGER trg_notify_community_reply
  AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_community_reply();

-- ─────────────────────────────────────────────────────────────
-- 3a. community_event_rsvps — "Going" on space calendar events
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_event_rsvps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  status     text NOT NULL DEFAULT 'going' CHECK (status IN ('going')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_event_rsvps_event
  ON public.community_event_rsvps (event_id);

GRANT SELECT, INSERT, DELETE ON public.community_event_rsvps TO authenticated;
GRANT ALL ON public.community_event_rsvps TO service_role;

ALTER TABLE public.community_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Read: your own RSVP, or any RSVP on an event in a community you can access
-- (renders going-count + attendee avatars for members).
DROP POLICY IF EXISTS "View RSVPs with community access" ON public.community_event_rsvps;
CREATE POLICY "View RSVPs with community access"
  ON public.community_event_rsvps FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.community_events e
      WHERE e.id = community_event_rsvps.event_id
        AND public.has_creator_access(e.creator_id)
    )
  );

-- RSVP: members only (has_creator_access), never while banned.
DROP POLICY IF EXISTS "Members can RSVP" ON public.community_event_rsvps;
CREATE POLICY "Members can RSVP"
  ON public.community_event_rsvps FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.community_events e
      WHERE e.id = community_event_rsvps.event_id
        AND public.has_creator_access(e.creator_id)
        AND NOT public.is_community_banned(e.creator_id)
    )
  );

-- Un-RSVP: your own row; event owners can also clear RSVPs on their events.
DROP POLICY IF EXISTS "Users can un-RSVP" ON public.community_event_rsvps;
CREATE POLICY "Users can un-RSVP"
  ON public.community_event_rsvps FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.community_events e
      WHERE e.id = community_event_rsvps.event_id
        AND e.creator_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3b. "+15 Attend an event" — advertised but never wired.
--     SECURITY DEFINER award trigger, identical shape/values pattern to
--     20260706133000_server_side_points.sql (post +5 / comment +2 / like +1 /
--     lesson_complete +10). source_id = event_id + the existing unique index
--     member_points_user_action_source_key means un-RSVP/re-RSVP cannot farm
--     points.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_points_on_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.community_events WHERE id = NEW.event_id;
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
    VALUES (NEW.user_id, v_creator_id, 'event_rsvp', 15, NEW.event_id)
    ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_on_rsvp ON public.community_event_rsvps;
CREATE TRIGGER award_points_on_rsvp
  AFTER INSERT ON public.community_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_rsvp();
