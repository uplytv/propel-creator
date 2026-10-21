-- Paid video uploads use Mux SIGNED playback (playback_policy = 'signed').
-- A signed playback id is useless without a per-viewer JWT, which only
-- sign-playback-token mints, after this RPC says the viewer is entitled.

ALTER TABLE public.mux_assets
  ADD COLUMN IF NOT EXISTS playback_policy text NOT NULL DEFAULT 'public';
DO $$ BEGIN
  ALTER TABLE public.mux_assets
    ADD CONSTRAINT mux_assets_playback_policy_chk CHECK (playback_policy IN ('public', 'signed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entitlement for uploaded assets and classroom lessons.
--   ref_type 'asset'  : mux_assets.id
--   ref_type 'lesson' : classroom_lessons.id (video resolved via mux_upload_id)
-- Allowed when: the viewer owns the asset / is the lesson's creator, OR the
-- asset is public-policy, OR it backs a lesson the viewer may open
-- (free lesson, or has_creator_access(creator) — same rule as lesson RLS).
CREATE OR REPLACE FUNCTION public.get_signed_asset_playback(p_ref_id uuid, p_ref_type text DEFAULT 'asset')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_asset public.mux_assets%ROWTYPE;
  v_lesson record;
  v_allowed boolean := false;
  v_playback text;
BEGIN
  IF p_ref_type = 'lesson' THEN
    SELECT l.id, l.creator_id, l.is_free, l.mux_upload_id, l.mux_playback_id
      INTO v_lesson FROM public.classroom_lessons l WHERE l.id = p_ref_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
    SELECT * INTO v_asset FROM public.mux_assets a
     WHERE (v_lesson.mux_upload_id IS NOT NULL AND a.upload_id = v_lesson.mux_upload_id)
        OR (v_lesson.mux_playback_id IS NOT NULL AND a.mux_playback_id = v_lesson.mux_playback_id)
     ORDER BY a.created_at DESC LIMIT 1;
    v_playback := COALESCE(v_asset.mux_playback_id, v_lesson.mux_playback_id);
    v_allowed := v_uid IS NOT NULL AND (
      v_uid = v_lesson.creator_id
      OR COALESCE(v_lesson.is_free, false)
      OR public.has_creator_access(v_lesson.creator_id)
    );
  ELSIF p_ref_type = 'asset' THEN
    SELECT * INTO v_asset FROM public.mux_assets a WHERE a.id = p_ref_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
    v_playback := v_asset.mux_playback_id;
    v_allowed := v_asset.playback_policy = 'public'
      OR (v_uid IS NOT NULL AND v_uid = v_asset.user_id)
      OR (v_uid IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.classroom_lessons l
             WHERE (l.mux_upload_id = v_asset.upload_id OR l.mux_playback_id = v_asset.mux_playback_id)
               AND (l.creator_id = v_uid OR COALESCE(l.is_free, false) OR public.has_creator_access(l.creator_id))));
  ELSE
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'allowed', v_allowed,
    'policy', COALESCE(v_asset.playback_policy, 'public'),
    'playback_id', CASE WHEN v_allowed THEN v_playback ELSE NULL END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_signed_asset_playback(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_signed_asset_playback(uuid, text) TO authenticated;
