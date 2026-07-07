-- ═══════════════════════════════════════════════════════════════════════════
-- MEMBER DMs v1 — harden the EXISTING member DM system
-- ═══════════════════════════════════════════════════════════════════════════
-- DECISION: public.direct_conversations + public.direct_messages already exist
-- (20260316180233) with participant-only RLS and realtime, and every current
-- entry point (creator profile "Message" buttons, story replies, useInbox,
-- MatchModal) writes to them. Creating a parallel dm_threads/dm_messages pair
-- would fork the member DM graph (same trap as the two ticket systems), so
-- this migration upgrades the canonical tables in place — everything additive
-- or a strict tightening:
--   1. Ordered-pair + body-length CHECKs (NOT VALID: legacy rows never break)
--   2. dm_blocks (both-direction block, enforced in the message INSERT policy
--      via a SECURITY DEFINER helper so blocked_id rows are visible to it)
--   3. get_or_create_dm_conversation(other) — race-safe UNIQUE-pair upsert
--   4. Recipient-only UPDATE policy (mark-read); senders can no longer touch
--      rows after send (only markRead ever used UPDATE — verified in src/)
--   5. last_message_at bump trigger (server-side, never-block)
--   6. "new_message" notification trigger with burst-collapse dedupe,
--      mirroring notify_on_job_message from 20260706150000
--   7. Hot-path indexes for thread lists + unread counts
-- Realtime: both tables are already in supabase_realtime (20260316180233);
-- re-added below behind an idempotent guard in case of publication drift.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Constraints (guarded + NOT VALID so existing rows can never fail deploy)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'direct_conversations_ordered_pair'
      AND conrelid = 'public.direct_conversations'::regclass
  ) THEN
    -- App code has always sorted the pair before insert; enforce it for new
    -- rows so UNIQUE(participant_one, participant_two) is a true pair key.
    ALTER TABLE public.direct_conversations
      ADD CONSTRAINT direct_conversations_ordered_pair
      CHECK (participant_one < participant_two) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'direct_messages_body_max_2000'
      AND conrelid = 'public.direct_messages'::regclass
  ) THEN
    ALTER TABLE public.direct_messages
      ADD CONSTRAINT direct_messages_body_max_2000
      CHECK (char_length(content) <= 2000) NOT VALID;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. dm_blocks — one row per (blocker, blocked); enforced both directions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dm_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dm_blocks_no_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT dm_blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.dm_blocks ENABLE ROW LEVEL SECURITY;

-- Blocker manages (and sees) only their own block list. The blocked user is
-- deliberately NOT told: their sends just fail with an RLS error the UI maps
-- to "Message could not be delivered".
DROP POLICY IF EXISTS "Users can view own blocks" ON public.dm_blocks;
CREATE POLICY "Users can view own blocks" ON public.dm_blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can create own blocks" ON public.dm_blocks;
CREATE POLICY "Users can create own blocks" ON public.dm_blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can remove own blocks" ON public.dm_blocks;
CREATE POLICY "Users can remove own blocks" ON public.dm_blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

CREATE INDEX IF NOT EXISTS idx_dm_blocks_blocked ON public.dm_blocks (blocked_id);

-- SECURITY DEFINER so the message INSERT policy can see blocks in BOTH
-- directions (RLS on dm_blocks hides "they blocked me" rows from the sender).
CREATE OR REPLACE FUNCTION public.is_dm_blocked(p_user_a UUID, p_user_b UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_blocks
    WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
       OR (blocker_id = p_user_b AND blocked_id = p_user_a)
  );
$$;

REVOKE ALL ON FUNCTION public.is_dm_blocked(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dm_blocked(UUID, UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tightened RLS on direct_messages
--    INSERT: sender must be a participant AND the pair must not be blocked
--    UPDATE: recipient only (mark-read); senders cannot edit after send
--    (SELECT policy from 20260316180233 is already participants-only — kept.)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.direct_messages;
CREATE POLICY "Users can send messages in their conversations" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE c.id = direct_messages.conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
        -- Symmetric check: blocks apply in both directions.
        AND NOT public.is_dm_blocked(c.participant_one, c.participant_two)
    )
  );

DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.direct_messages;
CREATE POLICY "Recipients can mark messages read" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() <> sender_id
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE c.id = direct_messages.conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() <> sender_id
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE c.id = direct_messages.conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. get_or_create_dm_conversation — race-safe pair upsert used by every
--    "Message" entry point. Orders the pair server-side (uuid LEAST/GREATEST
--    matches the lexicographic sort the app has always done) and refuses
--    blocked pairs up front.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(p_other_user UUID)
  RETURNS UUID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_other_user IS NULL OR p_other_user = v_me THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;
  IF public.is_dm_blocked(v_me, p_other_user) THEN
    RAISE EXCEPTION 'Messaging unavailable for this user';
  END IF;

  INSERT INTO public.direct_conversations (participant_one, participant_two)
  VALUES (LEAST(v_me, p_other_user), GREATEST(v_me, p_other_user))
  ON CONFLICT (participant_one, participant_two)
    DO UPDATE SET last_message_at = public.direct_conversations.last_message_at
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_dm_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Server-side last_message_at bump (never-block; replaces the client-side
--    UPDATE which stays harmless where it still runs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_dm_conversation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  BEGIN
    UPDATE public.direct_conversations
    SET last_message_at = COALESCE(NEW.created_at, now())
    WHERE id = NEW.conversation_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[direct_messages] touch_dm_conversation failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_dm_conversation ON public.direct_messages;
CREATE TRIGGER trg_touch_dm_conversation
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_dm_conversation();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Notification: recipient gets ONE "new_message" per unread burst per
--    conversation (identical burst-collapse pattern to notify_on_job_message
--    in 20260706150000). SECURITY DEFINER + never-block.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_direct_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_recipient   UUID;
  v_sender_name TEXT;
BEGIN
  BEGIN
    SELECT CASE WHEN c.participant_one = NEW.sender_id THEN c.participant_two ELSE c.participant_one END
      INTO v_recipient
    FROM public.direct_conversations c
    WHERE c.id = NEW.conversation_id;

    IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN
      RETURN NEW;
    END IF;

    -- Burst collapse: while an UNREAD new_message notification exists for this
    -- conversation, further messages don't stack more rows.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_recipient
        AND type = 'new_message'
        AND reference_id = NEW.conversation_id::text
        AND read = false
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
    FROM public.profiles WHERE user_id = NEW.sender_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      v_recipient,
      'new_message',
      'New Message 💬',
      COALESCE(v_sender_name, 'Someone') || ': ' || LEFT(NEW.content, 100),
      NEW.sender_id,
      NEW.conversation_id::text,
      '/dm?c=' || NEW.conversation_id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[direct_messages] notify_on_direct_message failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_direct_message ON public.direct_messages;
CREATE TRIGGER trg_notify_direct_message
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_direct_message();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Hot-path indexes (thread ordering, per-thread history, unread counts)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_created
  ON public.direct_messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_direct_messages_unread
  ON public.direct_messages (conversation_id, sender_id)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_direct_conversations_p2
  ON public.direct_conversations (participant_two, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_conversations_p1
  ON public.direct_conversations (participant_one, last_message_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Realtime publication (idempotent — both were added in 20260316180233;
--    guard protects against publication drift on older environments)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_conversations;
  END IF;
END $$;
