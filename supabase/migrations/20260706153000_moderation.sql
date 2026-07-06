-- ============================================================
-- 20260706153000_moderation
-- Moderation for live chat + communities:
--   * chat_moderation  — stream-level bans & timeouts (keyed by stream creator)
--   * community_bans   — community-level bans (keyed by space creator)
--   * content_reports  — member reports on posts / comments / chat messages
--   * RLS enforcement  — banned / timed-out users cannot INSERT chat messages,
--                        community posts, comments, or re-join a community
--   * slow mode        — mux_live_streams.slow_mode_seconds + BEFORE INSERT
--                        trigger on live_chat_messages
--
-- Non-destructive: only additive tables/columns/functions/policies. The only
-- DROP POLICY statements recreate existing policies with their ORIGINAL
-- condition AND an added ban check (policy drops don't touch data).
-- ============================================================

-- ── 1. chat_moderation: stream chat bans + timeouts ─────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_moderation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_creator_id uuid NOT NULL,
  target_user_id    uuid NOT NULL,
  kind              text NOT NULL CHECK (kind IN ('ban', 'timeout')),
  expires_at        timestamptz,          -- NULL for bans; set for timeouts
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_creator_id, target_user_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_chat_moderation_target
  ON public.chat_moderation (target_user_id, stream_creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_moderation TO authenticated;
GRANT ALL ON public.chat_moderation TO service_role;

ALTER TABLE public.chat_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stream creators manage chat moderation"
  ON public.chat_moderation FOR ALL TO authenticated
  USING (auth.uid() = stream_creator_id)
  WITH CHECK (auth.uid() = stream_creator_id AND auth.uid() = created_by);

CREATE POLICY "Users can view own chat restrictions"
  ON public.chat_moderation FOR SELECT TO authenticated
  USING (auth.uid() = target_user_id);

-- Realtime so a restricted viewer's chat input can lock immediately
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_moderation'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_moderation;
  END IF;
END $$;

-- ── 2. community_bans ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_bans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     uuid NOT NULL,
  target_user_id uuid NOT NULL,
  reason         text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, target_user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_bans_target
  ON public.community_bans (target_user_id, creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_bans TO authenticated;
GRANT ALL ON public.community_bans TO service_role;

ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage community bans"
  ON public.community_bans FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view own community bans"
  ON public.community_bans FOR SELECT TO authenticated
  USING (auth.uid() = target_user_id);

-- ── 3. content_reports ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid NOT NULL,
  creator_id   uuid NOT NULL,   -- owner of the space/stream the content lives in
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'chat')),
  content_id   uuid NOT NULL,
  reason       text,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_content_reports_creator_status
  ON public.content_reports (creator_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report content"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters can view own reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Creators can view reports for their space"
  ON public.content_reports FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can update reports for their space"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ── 4. Enforcement helpers (SECURITY DEFINER so policy checks are not blocked
--       by RLS on the moderation tables; same pattern as has_creator_access) ──
CREATE OR REPLACE FUNCTION public.is_stream_chat_blocked(_stream_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mux_live_streams s
    JOIN public.chat_moderation cm ON cm.stream_creator_id = s.user_id
    WHERE s.id = _stream_id
      AND cm.target_user_id = auth.uid()
      AND (cm.kind = 'ban' OR (cm.kind = 'timeout' AND cm.expires_at > now()))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_banned(_creator_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_bans b
    WHERE b.creator_id = _creator_id
      AND b.target_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_banned_from_post_community(_post_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_posts p
    JOIN public.community_bans b ON b.creator_id = p.creator_id
    WHERE p.id = _post_id
      AND b.target_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_stream_chat_blocked(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_community_banned(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_banned_from_post_community(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_stream_chat_blocked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_banned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned_from_post_community(uuid) TO authenticated;

-- ── 5. Enforcement: recreate INSERT policies with original condition + ban check

-- live_chat_messages INSERT
-- Original (20260316011231): WITH CHECK (auth.uid() = user_id)
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.live_chat_messages;
CREATE POLICY "Authenticated users can insert messages"
  ON public.live_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_stream_chat_blocked(stream_id)
  );

-- live_chat_messages DELETE for the stream owner (was missing entirely)
DROP POLICY IF EXISTS "Stream owners can delete messages" ON public.live_chat_messages;
CREATE POLICY "Stream owners can delete messages"
  ON public.live_chat_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mux_live_streams s
      WHERE s.id = live_chat_messages.stream_id
        AND s.user_id = auth.uid()
    )
  );

-- community_posts INSERT
-- Original (20260311094826): WITH CHECK (auth.uid() = author_id)
DROP POLICY IF EXISTS "Authors can create posts" ON public.community_posts;
CREATE POLICY "Authors can create posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND NOT public.is_community_banned(creator_id)
  );

-- community_comments INSERT
-- Original (20260311094826): WITH CHECK (auth.uid() = author_id)
DROP POLICY IF EXISTS "Users can comment" ON public.community_comments;
CREATE POLICY "Users can comment"
  ON public.community_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND NOT public.is_banned_from_post_community(post_id)
  );

-- community_members INSERT (block banned users from re-joining)
-- Original (20260311094826): WITH CHECK (auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can join" ON public.community_members;
CREATE POLICY "Users can join"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_community_banned(creator_id)
  );

-- community_members DELETE by the space creator (only self-delete existed)
DROP POLICY IF EXISTS "Creators can remove members" ON public.community_members;
CREATE POLICY "Creators can remove members"
  ON public.community_members FOR DELETE TO authenticated
  USING (auth.uid() = creator_id);

-- community_comments DELETE by the space creator (moderation; only author-delete existed)
DROP POLICY IF EXISTS "Creators can delete comments in their space" ON public.community_comments;
CREATE POLICY "Creators can delete comments in their space"
  ON public.community_comments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = community_comments.post_id
        AND p.creator_id = auth.uid()
    )
  );

-- ── 6. Slow mode ─────────────────────────────────────────────────────────────
ALTER TABLE public.mux_live_streams
  ADD COLUMN IF NOT EXISTS slow_mode_seconds integer NOT NULL DEFAULT 0
  CHECK (slow_mode_seconds >= 0 AND slow_mode_seconds <= 300);

COMMENT ON COLUMN public.mux_live_streams.slow_mode_seconds IS
  'Minimum seconds between chat messages per viewer (0 = off). Enforced by trg_enforce_chat_slow_mode; stream owner is exempt.';

-- Supports the "last message from this user in this stream" trigger lookup
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_stream_user_time
  ON public.live_chat_messages (stream_id, user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_chat_slow_mode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slow    integer;
  v_creator uuid;
  v_last    timestamptz;
  v_wait    integer;
BEGIN
  SELECT slow_mode_seconds, user_id
  INTO v_slow, v_creator
  FROM public.mux_live_streams
  WHERE id = NEW.stream_id;

  -- No stream row / slow mode off / stream owner is exempt
  IF v_slow IS NULL OR v_slow <= 0 OR NEW.user_id = v_creator THEN
    RETURN NEW;
  END IF;

  SELECT MAX(created_at)
  INTO v_last
  FROM public.live_chat_messages
  WHERE stream_id = NEW.stream_id
    AND user_id = NEW.user_id;

  IF v_last IS NOT NULL AND now() - v_last < make_interval(secs => v_slow) THEN
    v_wait := CEIL(EXTRACT(EPOCH FROM (v_last + make_interval(secs => v_slow) - now())));
    RAISE EXCEPTION 'Slow mode is on — you can send another message in % second(s)', GREATEST(v_wait, 1)
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_chat_slow_mode ON public.live_chat_messages;
CREATE TRIGGER trg_enforce_chat_slow_mode
  BEFORE INSERT ON public.live_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_slow_mode();
