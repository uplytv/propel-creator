-- Security batch 1 (2026-10-21): tighten "anyone can read" policies on paid content.
--
-- Review notes (USING (true) SELECT policies still live after all migrations):
--   * community_posts / community_comments / classroom_*: already gated by
--     20260611160000_gate_community_classroom_access.sql (has_creator_access). No change.
--   * posts: global social/blog feed with no space/privacy column; public by design. No change.
--   * space_media: the public "About" gallery of a creator space (marketing media,
--     uploaded to a public bucket). Public by design. No change.
--   * music_fan_club_exclusives: PAID fan-club content (body + media_url) was readable
--     by anyone, including anon; the paywall was only a client-side blur. FIXED below.
--
-- This migration only changes RLS policies and adds one read RPC. No data changes.

-- 1) Paid fan-club exclusives: full rows only for the artist or entitled fans.
DROP POLICY IF EXISTS "Exclusives metadata public" ON public.music_fan_club_exclusives;
DROP POLICY IF EXISTS "Exclusives visible to entitled fans" ON public.music_fan_club_exclusives;
CREATE POLICY "Exclusives visible to entitled fans"
  ON public.music_fan_club_exclusives FOR SELECT
  TO authenticated
  USING (
    auth.uid() = artist_id
    OR public.has_fan_club_access(artist_id, min_tier_id)
  );

-- 2) Teaser feed: everyone can see that an exclusive exists (title, kind,
--    thumbnail), but body/media_url are only returned to entitled viewers.
CREATE OR REPLACE FUNCTION public.get_fan_club_exclusives(_artist_id uuid)
RETURNS TABLE (
  id uuid,
  artist_id uuid,
  min_tier_id uuid,
  kind text,
  title text,
  body text,
  media_url text,
  thumbnail_url text,
  published_at timestamptz,
  is_locked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id, e.artist_id, e.min_tier_id, e.kind, e.title,
    CASE WHEN ok.allowed THEN e.body END,
    CASE WHEN ok.allowed THEN e.media_url END,
    e.thumbnail_url, e.published_at,
    NOT ok.allowed
  FROM public.music_fan_club_exclusives e
  CROSS JOIN LATERAL (
    SELECT (auth.uid() IS NOT NULL AND (auth.uid() = e.artist_id
            OR public.has_fan_club_access(e.artist_id, e.min_tier_id))) AS allowed
  ) ok
  WHERE e.artist_id = _artist_id
  ORDER BY e.published_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_fan_club_exclusives(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_fan_club_exclusives(uuid) TO anon, authenticated;
