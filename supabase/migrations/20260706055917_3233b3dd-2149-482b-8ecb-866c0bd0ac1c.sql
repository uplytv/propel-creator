-- ============ 20260706153000_moderation.sql ============
CREATE TABLE IF NOT EXISTS public.chat_moderation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_creator_id uuid NOT NULL,
  target_user_id    uuid NOT NULL,
  kind              text NOT NULL CHECK (kind IN ('ban', 'timeout')),
  expires_at        timestamptz,
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_moderation')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_moderation; END IF;
END $$;

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
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can view own community bans"
  ON public.community_bans FOR SELECT TO authenticated
  USING (auth.uid() = target_user_id);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid NOT NULL,
  creator_id   uuid NOT NULL,
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
  ON public.content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporters can view own reports"
  ON public.content_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "Creators can view reports for their space"
  ON public.content_reports FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creators can update reports for their space"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE OR REPLACE FUNCTION public.is_stream_chat_blocked(_stream_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.mux_live_streams s
    JOIN public.chat_moderation cm ON cm.stream_creator_id = s.user_id
    WHERE s.id = _stream_id AND cm.target_user_id = auth.uid()
      AND (cm.kind = 'ban' OR (cm.kind = 'timeout' AND cm.expires_at > now())));
$$;
CREATE OR REPLACE FUNCTION public.is_community_banned(_creator_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_bans b
    WHERE b.creator_id = _creator_id AND b.target_user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_banned_from_post_community(_post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_posts p
    JOIN public.community_bans b ON b.creator_id = p.creator_id
    WHERE p.id = _post_id AND b.target_user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_stream_chat_blocked(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_community_banned(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_banned_from_post_community(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_stream_chat_blocked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_banned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned_from_post_community(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.live_chat_messages;
CREATE POLICY "Authenticated users can insert messages"
  ON public.live_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_stream_chat_blocked(stream_id));

DROP POLICY IF EXISTS "Stream owners can delete messages" ON public.live_chat_messages;
CREATE POLICY "Stream owners can delete messages"
  ON public.live_chat_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mux_live_streams s
    WHERE s.id = live_chat_messages.stream_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authors can create posts" ON public.community_posts;
CREATE POLICY "Authors can create posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_community_banned(creator_id));

DROP POLICY IF EXISTS "Users can comment" ON public.community_comments;
CREATE POLICY "Users can comment"
  ON public.community_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_banned_from_post_community(post_id));

DROP POLICY IF EXISTS "Users can join" ON public.community_members;
CREATE POLICY "Users can join"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_community_banned(creator_id));

DROP POLICY IF EXISTS "Creators can remove members" ON public.community_members;
CREATE POLICY "Creators can remove members"
  ON public.community_members FOR DELETE TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete comments in their space" ON public.community_comments;
CREATE POLICY "Creators can delete comments in their space"
  ON public.community_comments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_posts p
    WHERE p.id = community_comments.post_id AND p.creator_id = auth.uid()));

ALTER TABLE public.mux_live_streams
  ADD COLUMN IF NOT EXISTS slow_mode_seconds integer NOT NULL DEFAULT 0
  CHECK (slow_mode_seconds >= 0 AND slow_mode_seconds <= 300);

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_stream_user_time
  ON public.live_chat_messages (stream_id, user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_chat_slow_mode()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slow integer; v_creator uuid; v_last timestamptz; v_wait integer;
BEGIN
  SELECT slow_mode_seconds, user_id INTO v_slow, v_creator
  FROM public.mux_live_streams WHERE id = NEW.stream_id;
  IF v_slow IS NULL OR v_slow <= 0 OR NEW.user_id = v_creator THEN RETURN NEW; END IF;
  SELECT MAX(created_at) INTO v_last FROM public.live_chat_messages
  WHERE stream_id = NEW.stream_id AND user_id = NEW.user_id;
  IF v_last IS NOT NULL AND now() - v_last < make_interval(secs => v_slow) THEN
    v_wait := CEIL(EXTRACT(EPOCH FROM (v_last + make_interval(secs => v_slow) - now())));
    RAISE EXCEPTION 'Slow mode is on — you can send another message in % second(s)', GREATEST(v_wait, 1)
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_chat_slow_mode ON public.live_chat_messages;
CREATE TRIGGER trg_enforce_chat_slow_mode BEFORE INSERT ON public.live_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chat_slow_mode();

-- ============ 20260706160000_ppv_access.sql ============
ALTER TABLE public.mux_live_streams
  ADD COLUMN IF NOT EXISTS is_ppv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppv_price numeric(10,2);

CREATE TABLE IF NOT EXISTS public.stream_playback_vault (
  ref_type text NOT NULL CHECK (ref_type IN ('stream', 'recording', 'asset')),
  ref_id uuid NOT NULL,
  playback_id text NOT NULL,
  download_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ref_type, ref_id)
);
GRANT ALL ON public.stream_playback_vault TO service_role;
ALTER TABLE public.stream_playback_vault ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_live_products_stream_type
  ON public.live_products (stream_id, type);
CREATE INDEX IF NOT EXISTS idx_live_purchases_buyer_product_status
  ON public.live_purchases (buyer_id, live_product_id, status);

CREATE OR REPLACE FUNCTION public.has_stream_ppv_access(p_stream_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.mux_live_streams s
      WHERE s.id = p_stream_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.live_purchases lp
      JOIN public.live_products p ON p.id = lp.live_product_id
      WHERE p.stream_id = p_stream_id AND p.type = 'ppv_access'
        AND lp.buyer_id = auth.uid() AND lp.status = 'completed')
    OR EXISTS (SELECT 1 FROM public.mux_live_streams s
      WHERE s.id = p_stream_id AND s.event_id IS NOT NULL
        AND public.has_event_livestream_access(s.event_id));
$$;
REVOKE ALL ON FUNCTION public.has_stream_ppv_access(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_stream_ppv_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_stream_ppv_access(uuid) TO anon;

CREATE OR REPLACE FUNCTION public.get_stream_playback(p_ref_id uuid, p_ref_type text DEFAULT 'stream')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_source_stream_id uuid; v_is_ppv boolean := false; v_price numeric;
  v_allowed boolean := true; v_playback text; v_product_id uuid; v_mux_asset_id text;
BEGIN
  IF p_ref_type = 'stream' THEN
    SELECT s.id, COALESCE(s.is_ppv, false), s.ppv_price, COALESCE(v.playback_id, s.mux_playback_id)
      INTO v_source_stream_id, v_is_ppv, v_price, v_playback
      FROM public.mux_live_streams s
      LEFT JOIN public.stream_playback_vault v ON v.ref_type = 'stream' AND v.ref_id = s.id
     WHERE s.id = p_ref_id;
    IF v_source_stream_id IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  ELSIF p_ref_type = 'recording' THEN
    SELECT COALESCE(v.playback_id, r.playback_id), r.mux_asset_id
      INTO v_playback, v_mux_asset_id
      FROM public.stream_recordings r
      LEFT JOIN public.stream_playback_vault v ON v.ref_type = 'recording' AND v.ref_id = r.id
     WHERE r.id = p_ref_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
    SELECT s.id, COALESCE(s.is_ppv, false), s.ppv_price
      INTO v_source_stream_id, v_is_ppv, v_price
      FROM public.live_stream_sessions ls
      JOIN public.mux_live_streams s ON s.id = ls.stream_id
     WHERE ls.mux_asset_id = v_mux_asset_id
     ORDER BY ls.started_at DESC NULLS LAST LIMIT 1;
  ELSIF p_ref_type = 'asset' THEN
    SELECT COALESCE(v.playback_id, a.mux_playback_id), a.mux_asset_id
      INTO v_playback, v_mux_asset_id
      FROM public.mux_assets a
      LEFT JOIN public.stream_playback_vault v ON v.ref_type = 'asset' AND v.ref_id = a.id
     WHERE a.id = p_ref_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
    SELECT s.id, COALESCE(s.is_ppv, false), s.ppv_price
      INTO v_source_stream_id, v_is_ppv, v_price
      FROM public.live_stream_sessions ls
      JOIN public.mux_live_streams s ON s.id = ls.stream_id
     WHERE ls.mux_asset_id = v_mux_asset_id
     ORDER BY ls.started_at DESC NULLS LAST LIMIT 1;
  ELSE
    RETURN jsonb_build_object('found', false);
  END IF;
  v_is_ppv := COALESCE(v_is_ppv, false);
  IF v_is_ppv THEN
    v_allowed := public.has_stream_ppv_access(v_source_stream_id);
    SELECT id INTO v_product_id FROM public.live_products
     WHERE stream_id = v_source_stream_id AND type = 'ppv_access'
     ORDER BY created_at DESC LIMIT 1;
  END IF;
  RETURN jsonb_build_object(
    'found', true, 'is_ppv', v_is_ppv, 'allowed', v_allowed,
    'ppv_price', v_price, 'ppv_product_id', v_product_id,
    'stream_id', v_source_stream_id,
    'playback_id', CASE WHEN v_allowed THEN v_playback ELSE NULL END);
END; $$;
REVOKE ALL ON FUNCTION public.get_stream_playback(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_stream_playback(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stream_playback(uuid, text) TO anon;

CREATE OR REPLACE FUNCTION public.vault_ppv_stream_playback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_restored text;
BEGIN
  IF COALESCE(NEW.is_ppv, false) THEN
    IF NEW.mux_playback_id IS NOT NULL THEN
      INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id)
      VALUES ('stream', NEW.id, NEW.mux_playback_id)
      ON CONFLICT (ref_type, ref_id) DO UPDATE SET playback_id = EXCLUDED.playback_id;
      NEW.mux_playback_id := NULL;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.is_ppv, false) AND NOT COALESCE(NEW.is_ppv, false) THEN
    SELECT playback_id INTO v_restored FROM public.stream_playback_vault
     WHERE ref_type = 'stream' AND ref_id = NEW.id;
    IF v_restored IS NOT NULL AND NEW.mux_playback_id IS NULL THEN
      NEW.mux_playback_id := v_restored;
    END IF;
    DELETE FROM public.stream_playback_vault WHERE ref_type = 'stream' AND ref_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vault_ppv_stream_playback ON public.mux_live_streams;
CREATE TRIGGER trg_vault_ppv_stream_playback BEFORE INSERT OR UPDATE ON public.mux_live_streams
  FOR EACH ROW EXECUTE FUNCTION public.vault_ppv_stream_playback();

CREATE OR REPLACE FUNCTION public.vault_ppv_recording_playback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_ppv boolean := false;
BEGIN
  IF NEW.playback_id IS NULL OR NEW.mux_asset_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(s.is_ppv, false) INTO v_is_ppv
    FROM public.live_stream_sessions ls
    JOIN public.mux_live_streams s ON s.id = ls.stream_id
   WHERE ls.mux_asset_id = NEW.mux_asset_id
   ORDER BY ls.started_at DESC NULLS LAST LIMIT 1;
  IF COALESCE(v_is_ppv, false) THEN
    INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id, download_url)
    VALUES ('recording', NEW.id, NEW.playback_id, NEW.download_url)
    ON CONFLICT (ref_type, ref_id) DO UPDATE
      SET playback_id = EXCLUDED.playback_id, download_url = EXCLUDED.download_url;
    NEW.playback_id := NULL;
    NEW.download_url := NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vault_ppv_recording_playback ON public.stream_recordings;
CREATE TRIGGER trg_vault_ppv_recording_playback BEFORE INSERT OR UPDATE ON public.stream_recordings
  FOR EACH ROW EXECUTE FUNCTION public.vault_ppv_recording_playback();

CREATE OR REPLACE FUNCTION public.vault_ppv_asset_playback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_ppv boolean := false;
BEGIN
  IF NEW.mux_playback_id IS NULL OR NEW.mux_asset_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(s.is_ppv, false) INTO v_is_ppv
    FROM public.live_stream_sessions ls
    JOIN public.mux_live_streams s ON s.id = ls.stream_id
   WHERE ls.mux_asset_id = NEW.mux_asset_id
   ORDER BY ls.started_at DESC NULLS LAST LIMIT 1;
  IF COALESCE(v_is_ppv, false) THEN
    INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id)
    VALUES ('asset', NEW.id, NEW.mux_playback_id)
    ON CONFLICT (ref_type, ref_id) DO UPDATE SET playback_id = EXCLUDED.playback_id;
    NEW.mux_playback_id := NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vault_ppv_asset_playback ON public.mux_assets;
CREATE TRIGGER trg_vault_ppv_asset_playback BEFORE INSERT OR UPDATE ON public.mux_assets
  FOR EACH ROW EXECUTE FUNCTION public.vault_ppv_asset_playback();

CREATE OR REPLACE FUNCTION public.vault_ppv_on_session_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_ppv boolean := false;
BEGIN
  IF NEW.mux_asset_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(s.is_ppv, false) INTO v_is_ppv
    FROM public.mux_live_streams s WHERE s.id = NEW.stream_id;
  IF NOT COALESCE(v_is_ppv, false) THEN RETURN NEW; END IF;
  INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id, download_url)
  SELECT 'recording', r.id, r.playback_id, r.download_url
    FROM public.stream_recordings r
   WHERE r.mux_asset_id = NEW.mux_asset_id AND r.playback_id IS NOT NULL
  ON CONFLICT (ref_type, ref_id) DO UPDATE
    SET playback_id = EXCLUDED.playback_id, download_url = EXCLUDED.download_url;
  UPDATE public.stream_recordings
     SET playback_id = NULL, download_url = NULL
   WHERE mux_asset_id = NEW.mux_asset_id AND playback_id IS NOT NULL;
  INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id)
  SELECT 'asset', a.id, a.mux_playback_id
    FROM public.mux_assets a
   WHERE a.mux_asset_id = NEW.mux_asset_id AND a.mux_playback_id IS NOT NULL
  ON CONFLICT (ref_type, ref_id) DO UPDATE SET playback_id = EXCLUDED.playback_id;
  UPDATE public.mux_assets
     SET mux_playback_id = NULL
   WHERE mux_asset_id = NEW.mux_asset_id AND mux_playback_id IS NOT NULL;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_vault_ppv_on_session_link ON public.live_stream_sessions;
CREATE TRIGGER trg_vault_ppv_on_session_link
  AFTER INSERT OR UPDATE OF mux_asset_id ON public.live_stream_sessions
  FOR EACH ROW EXECUTE FUNCTION public.vault_ppv_on_session_link();

-- ============ 20260706170000_classroom_lessons_richer.sql ============
ALTER TABLE public.classroom_lessons
  ADD COLUMN IF NOT EXISTS lesson_links   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mux_upload_id  text,
  ADD COLUMN IF NOT EXISTS mux_playback_id text,
  ADD COLUMN IF NOT EXISTS video_status   text;
ALTER TABLE public.classroom_lessons ENABLE ROW LEVEL SECURITY;

-- ============ 20260706180000_refund_clawback.sql ============
CREATE TABLE IF NOT EXISTS public.stripe_refund_clawbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id text NOT NULL UNIQUE,
  stripe_charge_id text,
  stripe_payment_intent_id text,
  wallet_id uuid,
  clawback_amount numeric,
  wallet_decrement numeric,
  shortfall numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_refund_clawbacks_pi
  ON public.stripe_refund_clawbacks (stripe_payment_intent_id);
GRANT ALL ON public.stripe_refund_clawbacks TO service_role;
ALTER TABLE public.stripe_refund_clawbacks ENABLE ROW LEVEL SECURITY;