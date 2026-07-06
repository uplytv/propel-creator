-- ═══════════════════════════════════════════════════════════════════════════
-- PPV (Pay-Per-View) live streams + PPV VOD access — ADDITIVE, backward compatible.
--
-- Model:
--   * mux_live_streams.is_ppv / ppv_price mark a stream as pay-per-view.
--   * Access is sold as a live_products row with type = 'ppv_access' on the
--     stream, purchased through the existing stripe-create-live-purchase edge
--     fn. The (untouched) stripe-webhook already completes live_purchases rows
--     for purchase_type 'live_product' and credits the creator wallet 95/5,
--     so PPV entitlements are finalized with ZERO webhook changes.
--   * has_stream_ppv_access(stream_id): creator, completed ppv purchase, or —
--     for event-linked streams — an event ticket (has_event_livestream_access).
--   * Server-side playback protection WITHOUT touching webhooks: BEFORE
--     triggers move playback ids of PPV rows out of the publicly-readable
--     columns into stream_playback_vault (RLS: no client access). The
--     SECURITY DEFINER RPC get_stream_playback() is then the only way for a
--     client to obtain a PPV playback id, and it checks entitlement first.
--     Free/non-PPV streams are entirely unaffected (triggers no-op).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) PPV columns on live streams
ALTER TABLE public.mux_live_streams
  ADD COLUMN IF NOT EXISTS is_ppv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppv_price numeric(10,2);

-- 2) Protected vault for playback ids of PPV content.
--    RLS enabled with NO policies: only service_role and SECURITY DEFINER
--    functions can read it.
CREATE TABLE IF NOT EXISTS public.stream_playback_vault (
  ref_type text NOT NULL CHECK (ref_type IN ('stream', 'recording', 'asset')),
  ref_id uuid NOT NULL,
  playback_id text NOT NULL,
  download_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ref_type, ref_id)
);
ALTER TABLE public.stream_playback_vault ENABLE ROW LEVEL SECURITY;
-- (intentionally no CREATE POLICY — deny-all for anon/authenticated)

-- Helpful indexes for the access checks below
CREATE INDEX IF NOT EXISTS idx_live_products_stream_type
  ON public.live_products (stream_id, type);
CREATE INDEX IF NOT EXISTS idx_live_purchases_buyer_product_status
  ON public.live_purchases (buyer_id, live_product_id, status);

-- 3) Entitlement check — server-verifiable, SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.has_stream_ppv_access(p_stream_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Creator always has access
    EXISTS (
      SELECT 1 FROM public.mux_live_streams s
      WHERE s.id = p_stream_id AND s.user_id = auth.uid()
    )
    -- Completed PPV purchase (finalized by the existing stripe-webhook)
    OR EXISTS (
      SELECT 1
      FROM public.live_purchases lp
      JOIN public.live_products p ON p.id = lp.live_product_id
      WHERE p.stream_id = p_stream_id
        AND p.type = 'ppv_access'
        AND lp.buyer_id = auth.uid()
        AND lp.status = 'completed'
    )
    -- Event-linked streams: ticket holders get in (existing PPV-event model)
    OR EXISTS (
      SELECT 1 FROM public.mux_live_streams s
      WHERE s.id = p_stream_id
        AND s.event_id IS NOT NULL
        AND public.has_event_livestream_access(s.event_id)
    );
$$;

REVOKE ALL ON FUNCTION public.has_stream_ppv_access(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_stream_ppv_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_stream_ppv_access(uuid) TO anon;

-- 4) The single client entry point for playback ids.
--    Works for live streams, stream recordings, and mux assets, resolving
--    recordings/assets back to their source stream to inherit the PPV gate.
--    Returns paywall metadata for everyone; playback_id only when allowed.
CREATE OR REPLACE FUNCTION public.get_stream_playback(p_ref_id uuid, p_ref_type text DEFAULT 'stream')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_stream_id uuid;
  v_is_ppv boolean := false;
  v_price numeric;
  v_allowed boolean := true;
  v_playback text;
  v_product_id uuid;
  v_mux_asset_id text;
BEGIN
  IF p_ref_type = 'stream' THEN
    SELECT s.id, COALESCE(s.is_ppv, false), s.ppv_price,
           COALESCE(v.playback_id, s.mux_playback_id)
      INTO v_source_stream_id, v_is_ppv, v_price, v_playback
      FROM public.mux_live_streams s
      LEFT JOIN public.stream_playback_vault v
        ON v.ref_type = 'stream' AND v.ref_id = s.id
     WHERE s.id = p_ref_id;
    IF v_source_stream_id IS NULL THEN
      RETURN jsonb_build_object('found', false);
    END IF;

  ELSIF p_ref_type = 'recording' THEN
    SELECT COALESCE(v.playback_id, r.playback_id), r.mux_asset_id
      INTO v_playback, v_mux_asset_id
      FROM public.stream_recordings r
      LEFT JOIN public.stream_playback_vault v
        ON v.ref_type = 'recording' AND v.ref_id = r.id
     WHERE r.id = p_ref_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('found', false);
    END IF;
    -- Resolve source stream for PPV inheritance
    SELECT s.id, COALESCE(s.is_ppv, false), s.ppv_price
      INTO v_source_stream_id, v_is_ppv, v_price
      FROM public.live_stream_sessions ls
      JOIN public.mux_live_streams s ON s.id = ls.stream_id
     WHERE ls.mux_asset_id = v_mux_asset_id
     ORDER BY ls.started_at DESC NULLS LAST
     LIMIT 1;

  ELSIF p_ref_type = 'asset' THEN
    SELECT COALESCE(v.playback_id, a.mux_playback_id), a.mux_asset_id
      INTO v_playback, v_mux_asset_id
      FROM public.mux_assets a
      LEFT JOIN public.stream_playback_vault v
        ON v.ref_type = 'asset' AND v.ref_id = a.id
     WHERE a.id = p_ref_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('found', false);
    END IF;
    SELECT s.id, COALESCE(s.is_ppv, false), s.ppv_price
      INTO v_source_stream_id, v_is_ppv, v_price
      FROM public.live_stream_sessions ls
      JOIN public.mux_live_streams s ON s.id = ls.stream_id
     WHERE ls.mux_asset_id = v_mux_asset_id
     ORDER BY ls.started_at DESC NULLS LAST
     LIMIT 1;

  ELSE
    RETURN jsonb_build_object('found', false);
  END IF;

  v_is_ppv := COALESCE(v_is_ppv, false);

  IF v_is_ppv THEN
    v_allowed := public.has_stream_ppv_access(v_source_stream_id);
    SELECT id INTO v_product_id
      FROM public.live_products
     WHERE stream_id = v_source_stream_id AND type = 'ppv_access'
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'is_ppv', v_is_ppv,
    'allowed', v_allowed,
    'ppv_price', v_price,
    'ppv_product_id', v_product_id,
    'stream_id', v_source_stream_id,
    'playback_id', CASE WHEN v_allowed THEN v_playback ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_stream_playback(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_stream_playback(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stream_playback(uuid, text) TO anon;

-- 5) Vault triggers. These intercept ANY write (including the untouched
--    mux-webhook running as service_role) and keep PPV playback ids out of
--    publicly-selectable columns. Non-PPV rows pass through untouched.

-- 5a) Live streams: vault on insert/update while is_ppv; restore if PPV is
--     turned off.
CREATE OR REPLACE FUNCTION public.vault_ppv_stream_playback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restored text;
BEGIN
  IF COALESCE(NEW.is_ppv, false) THEN
    IF NEW.mux_playback_id IS NOT NULL THEN
      INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id)
      VALUES ('stream', NEW.id, NEW.mux_playback_id)
      ON CONFLICT (ref_type, ref_id) DO UPDATE SET playback_id = EXCLUDED.playback_id;
      NEW.mux_playback_id := NULL;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.is_ppv, false) AND NOT COALESCE(NEW.is_ppv, false) THEN
    -- PPV disabled → restore the public playback id
    SELECT playback_id INTO v_restored
      FROM public.stream_playback_vault
     WHERE ref_type = 'stream' AND ref_id = NEW.id;
    IF v_restored IS NOT NULL AND NEW.mux_playback_id IS NULL THEN
      NEW.mux_playback_id := v_restored;
    END IF;
    DELETE FROM public.stream_playback_vault WHERE ref_type = 'stream' AND ref_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vault_ppv_stream_playback ON public.mux_live_streams;
CREATE TRIGGER trg_vault_ppv_stream_playback
  BEFORE INSERT OR UPDATE ON public.mux_live_streams
  FOR EACH ROW EXECUTE FUNCTION public.vault_ppv_stream_playback();

-- 5b) Stream recordings: inherit PPV from the source stream (resolved via
--     live_stream_sessions). No-op when the linkage doesn't exist yet — the
--     session trigger (5d) sweeps those right after the webhook links them.
CREATE OR REPLACE FUNCTION public.vault_ppv_recording_playback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_ppv boolean := false;
BEGIN
  IF NEW.playback_id IS NULL OR NEW.mux_asset_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(s.is_ppv, false) INTO v_is_ppv
    FROM public.live_stream_sessions ls
    JOIN public.mux_live_streams s ON s.id = ls.stream_id
   WHERE ls.mux_asset_id = NEW.mux_asset_id
   ORDER BY ls.started_at DESC NULLS LAST
   LIMIT 1;
  IF COALESCE(v_is_ppv, false) THEN
    INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id, download_url)
    VALUES ('recording', NEW.id, NEW.playback_id, NEW.download_url)
    ON CONFLICT (ref_type, ref_id) DO UPDATE
      SET playback_id = EXCLUDED.playback_id,
          download_url = EXCLUDED.download_url;
    NEW.playback_id := NULL;
    NEW.download_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vault_ppv_recording_playback ON public.stream_recordings;
CREATE TRIGGER trg_vault_ppv_recording_playback
  BEFORE INSERT OR UPDATE ON public.stream_recordings
  FOR EACH ROW EXECUTE FUNCTION public.vault_ppv_recording_playback();

-- 5c) Mux assets (the webhook mirrors live recordings here with is_public=true)
CREATE OR REPLACE FUNCTION public.vault_ppv_asset_playback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_ppv boolean := false;
BEGIN
  IF NEW.mux_playback_id IS NULL OR NEW.mux_asset_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(s.is_ppv, false) INTO v_is_ppv
    FROM public.live_stream_sessions ls
    JOIN public.mux_live_streams s ON s.id = ls.stream_id
   WHERE ls.mux_asset_id = NEW.mux_asset_id
   ORDER BY ls.started_at DESC NULLS LAST
   LIMIT 1;
  IF COALESCE(v_is_ppv, false) THEN
    INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id)
    VALUES ('asset', NEW.id, NEW.mux_playback_id)
    ON CONFLICT (ref_type, ref_id) DO UPDATE SET playback_id = EXCLUDED.playback_id;
    NEW.mux_playback_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vault_ppv_asset_playback ON public.mux_assets;
CREATE TRIGGER trg_vault_ppv_asset_playback
  BEFORE INSERT OR UPDATE ON public.mux_assets
  FOR EACH ROW EXECUTE FUNCTION public.vault_ppv_asset_playback();

-- 5d) Session linkage sweep. The mux-webhook inserts stream_recordings /
--     mux_assets BEFORE it links the session (live_stream_sessions.mux_asset_id),
--     so at insert time the PPV resolution in 5b/5c can miss. The moment the
--     linkage lands, sweep any already-public rows for that asset.
CREATE OR REPLACE FUNCTION public.vault_ppv_on_session_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_ppv boolean := false;
BEGIN
  IF NEW.mux_asset_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(s.is_ppv, false) INTO v_is_ppv
    FROM public.mux_live_streams s
   WHERE s.id = NEW.stream_id;
  IF NOT COALESCE(v_is_ppv, false) THEN
    RETURN NEW;
  END IF;

  -- Vault + null recordings for this asset
  INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id, download_url)
  SELECT 'recording', r.id, r.playback_id, r.download_url
    FROM public.stream_recordings r
   WHERE r.mux_asset_id = NEW.mux_asset_id AND r.playback_id IS NOT NULL
  ON CONFLICT (ref_type, ref_id) DO UPDATE
    SET playback_id = EXCLUDED.playback_id,
        download_url = EXCLUDED.download_url;

  UPDATE public.stream_recordings
     SET playback_id = NULL, download_url = NULL
   WHERE mux_asset_id = NEW.mux_asset_id AND playback_id IS NOT NULL;

  -- Vault + null mirrored mux_assets rows
  INSERT INTO public.stream_playback_vault (ref_type, ref_id, playback_id)
  SELECT 'asset', a.id, a.mux_playback_id
    FROM public.mux_assets a
   WHERE a.mux_asset_id = NEW.mux_asset_id AND a.mux_playback_id IS NOT NULL
  ON CONFLICT (ref_type, ref_id) DO UPDATE SET playback_id = EXCLUDED.playback_id;

  UPDATE public.mux_assets
     SET mux_playback_id = NULL
   WHERE mux_asset_id = NEW.mux_asset_id AND mux_playback_id IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vault_ppv_on_session_link ON public.live_stream_sessions;
CREATE TRIGGER trg_vault_ppv_on_session_link
  AFTER INSERT OR UPDATE OF mux_asset_id ON public.live_stream_sessions
  FOR EACH ROW EXECUTE FUNCTION public.vault_ppv_on_session_link();
