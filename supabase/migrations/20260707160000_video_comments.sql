-- ============================================================
-- 20260707160000_video_comments
-- YouTube model for video pages: real comments on ALL non-live playback.
--
-- DISCOVERY: public.video_comments + public.video_comment_likes ALREADY exist
-- (20260318215425 created them keyed to videos(id) NOT NULL; 20260422161256
-- added parent_id one-level threading, reply_count, like_count and the likes
-- table with UNIQUE(comment_id, user_id) + count triggers). Instead of a
-- parallel table, this migration ADDITIVELY generalizes the existing one so a
-- single comment system covers uploads (videos), stream recordings
-- (stream_recordings), VOD assets (mux_assets) and stream rows
-- (mux_live_streams):
--   * ref_id / ref_type ('stream','recording','asset','video') columns,
--     backfilled from video_id ('video') and kept in sync by a BEFORE INSERT
--     trigger so the existing videos UI (useVideos.ts inserts video_id only)
--     keeps working unchanged.
--   * deleted boolean for soft-delete/moderation masking.
--   * body length cap (<= 2000, NOT VALID so legacy rows can't fail).
--   * UPDATE-own policy (soft-delete/edit own rows).
--   * moderate_video_comment(): SECURITY DEFINER — content owner (resolved
--     per ref_type, same ownership-resolution pattern as 20260706153000
--     moderation helpers) or the comment author may soft-delete.
--   * notify_on_video_comment(): comment -> content owner, reply -> parent
--     author. Never-block + unread burst-collapse (20260706150000 style).
--
-- RLS tradeoff (deliberate, kept simple + safe): SELECT stays public
-- (USING true, from 20260318215425). Comment BODIES on PPV/members-gated
-- VODs are therefore publicly readable even when the video itself is gated —
-- they contain no video content and no playback ids. Deleted rows keep RLS
-- SELECT but are masked client-side.
--
-- Non-destructive: only ADD COLUMN / DROP NOT NULL (reversible) / new
-- functions, policies, index, trigger. No DROPs of data or tables.
-- ============================================================

-- ── 1. New columns ───────────────────────────────────────────────────────────
ALTER TABLE public.video_comments
  ADD COLUMN IF NOT EXISTS ref_id   uuid,
  ADD COLUMN IF NOT EXISTS ref_type text,
  ADD COLUMN IF NOT EXISTS deleted  boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.video_comments.ref_id IS
  'Commented content id: videos.id | mux_live_streams.id | stream_recordings.id | mux_assets.id (see ref_type).';
COMMENT ON COLUMN public.video_comments.ref_type IS
  'What ref_id points at: stream | recording | asset | video.';
COMMENT ON COLUMN public.video_comments.deleted IS
  'Soft-delete flag (author or content owner via moderate_video_comment). Bodies masked client-side.';

-- ── 2. Backfill legacy rows (all existing comments were on videos) ──────────
UPDATE public.video_comments
SET ref_id = video_id, ref_type = 'video'
WHERE ref_id IS NULL;

-- video_id becomes optional: stream/recording/asset comments have no videos row.
-- (DROP NOT NULL is reversible and loses no data.)
ALTER TABLE public.video_comments ALTER COLUMN video_id DROP NOT NULL;

-- ── 3. Keep old insert path coherent (useVideos.ts inserts video_id only) ───
CREATE OR REPLACE FUNCTION public.video_comments_sync_ref()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Legacy path: video_id provided, ref columns absent -> derive them.
  IF NEW.ref_id IS NULL AND NEW.video_id IS NOT NULL THEN
    NEW.ref_id := NEW.video_id;
    NEW.ref_type := 'video';
  END IF;
  -- New path for videos: keep video_id set so the existing
  -- videos.comment_count triggers and video_id-filtered realtime keep working.
  IF NEW.ref_type = 'video' AND NEW.video_id IS NULL THEN
    NEW.video_id := NEW.ref_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_video_comments_sync_ref ON public.video_comments;
CREATE TRIGGER trg_video_comments_sync_ref
  BEFORE INSERT ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.video_comments_sync_ref();

-- ── 4. Constraints (after backfill; BEFORE trigger fills new inserts) ───────
ALTER TABLE public.video_comments ALTER COLUMN ref_id SET NOT NULL;
ALTER TABLE public.video_comments ALTER COLUMN ref_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'video_comments_ref_type_check'
      AND conrelid = 'public.video_comments'::regclass
  ) THEN
    ALTER TABLE public.video_comments
      ADD CONSTRAINT video_comments_ref_type_check
      CHECK (ref_type IN ('stream', 'recording', 'asset', 'video'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'video_comments_body_len_check'
      AND conrelid = 'public.video_comments'::regclass
  ) THEN
    -- NOT VALID: enforced for new rows only; legacy rows can never fail it.
    ALTER TABLE public.video_comments
      ADD CONSTRAINT video_comments_body_len_check
      CHECK (char_length(body) <= 2000) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_video_comments_ref
  ON public.video_comments (ref_type, ref_id, created_at DESC);

-- ── 5. RLS additions ─────────────────────────────────────────────────────────
-- Existing (20260318215425, unchanged): SELECT USING(true), INSERT
-- authenticated WITH CHECK (user_id = auth.uid()), DELETE own rows.
-- Added: UPDATE own rows (soft-delete / edit own comment).
DROP POLICY IF EXISTS "Users can update own comments" ON public.video_comments;
CREATE POLICY "Users can update own comments"
  ON public.video_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 6. Owner moderation: soft-delete any comment on your own content ────────
-- SECURITY DEFINER so the owner's UPDATE bypasses the author-only policy;
-- ownership resolved per ref_type (pattern: 20260706153000 helpers).
CREATE OR REPLACE FUNCTION public.moderate_video_comment(_comment_id uuid, _deleted boolean DEFAULT true)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_author   uuid;
  v_ref_id   uuid;
  v_ref_type text;
  v_owner    uuid;
BEGIN
  SELECT user_id, ref_id, ref_type INTO v_author, v_ref_id, v_ref_type
  FROM public.video_comments WHERE id = _comment_id;

  IF v_author IS NULL THEN
    RETURN false;
  END IF;

  v_owner := CASE v_ref_type
    WHEN 'video'     THEN (SELECT creator_id FROM public.videos            WHERE id = v_ref_id)
    WHEN 'stream'    THEN (SELECT user_id    FROM public.mux_live_streams  WHERE id = v_ref_id)
    WHEN 'recording' THEN (SELECT creator_id FROM public.stream_recordings WHERE id = v_ref_id)
    WHEN 'asset'     THEN (SELECT user_id    FROM public.mux_assets        WHERE id = v_ref_id)
  END;

  IF auth.uid() IS NULL
     OR (auth.uid() <> v_author AND (v_owner IS NULL OR auth.uid() <> v_owner)) THEN
    RETURN false;
  END IF;

  UPDATE public.video_comments SET deleted = _deleted WHERE id = _comment_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_video_comment(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.moderate_video_comment(uuid, boolean) TO authenticated;

-- ── 7. Notifications: comment -> content owner, reply -> parent author ──────
-- Never-block (EXCEPTION -> WARNING only) + unread burst-collapse per
-- reference, same design rules as 20260706150000_notification_engine.
CREATE OR REPLACE FUNCTION public.notify_on_video_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_recipient      uuid;
  v_commenter_name text;
  v_ntype          text;
  v_ref            text;
  v_link           text;
BEGIN
  BEGIN
    IF COALESCE(NEW.deleted, false) THEN
      RETURN NEW;
    END IF;

    IF NEW.parent_id IS NOT NULL THEN
      -- Reply -> parent comment author
      SELECT user_id INTO v_recipient FROM public.video_comments WHERE id = NEW.parent_id;
      v_ntype := 'comment_reply';
      v_ref   := NEW.parent_id::text;
    ELSE
      -- Top-level comment -> content owner
      v_recipient := CASE NEW.ref_type
        WHEN 'video'     THEN (SELECT creator_id FROM public.videos            WHERE id = NEW.ref_id)
        WHEN 'stream'    THEN (SELECT user_id    FROM public.mux_live_streams  WHERE id = NEW.ref_id)
        WHEN 'recording' THEN (SELECT creator_id FROM public.stream_recordings WHERE id = NEW.ref_id)
        WHEN 'asset'     THEN (SELECT user_id    FROM public.mux_assets        WHERE id = NEW.ref_id)
      END;
      v_ntype := 'video_comment';
      v_ref   := NEW.ref_id::text;
    END IF;

    IF v_recipient IS NULL OR v_recipient = NEW.user_id THEN
      RETURN NEW;
    END IF;

    -- Burst collapse: while an UNREAD notification for the same thread/content
    -- exists, further comments don't stack more rows.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_recipient
        AND type = v_ntype
        AND reference_id = v_ref
        AND read = false
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username, 'Someone') INTO v_commenter_name
    FROM public.profiles WHERE user_id = NEW.user_id;

    v_link := CASE NEW.ref_type
      WHEN 'recording' THEN '/stream/' || NEW.ref_id::text || '?type=recording'
      WHEN 'asset'     THEN '/stream/' || NEW.ref_id::text || '?type=vod'
      WHEN 'stream'    THEN '/stream/' || NEW.ref_id::text
      ELSE NULL
    END;
    IF v_link IS NULL THEN
      SELECT '/' || p.username || '/videos/' || COALESCE(v.slug, v.id::text)
      INTO v_link
      FROM public.videos v
      JOIN public.profiles p ON p.user_id = v.creator_id
      WHERE v.id = NEW.ref_id AND p.username IS NOT NULL;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      v_recipient,
      v_ntype,
      CASE WHEN v_ntype = 'comment_reply' THEN 'New Reply 💬' ELSE 'New Comment 💬' END,
      COALESCE(v_commenter_name, 'Someone')
        || CASE WHEN v_ntype = 'comment_reply' THEN ' replied: ' ELSE ' commented: ' END
        || LEFT(NEW.body, 100),
      NEW.user_id,
      v_ref,
      v_link
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[video_comments] notify_on_video_comment failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_video_comment ON public.video_comments;
CREATE TRIGGER trg_notify_video_comment
  AFTER INSERT ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_video_comment();
