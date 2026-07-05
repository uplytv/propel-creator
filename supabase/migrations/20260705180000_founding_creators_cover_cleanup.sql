-- ============================================================================
-- Founding Creators cover/gallery cleanup (owner-directed, 2026-07-05)
--
-- Context: the community About tab now renders a branded DefaultCommunityCover
-- (brand gradient + community name) whenever a space has no cover image and no
-- gallery media. The owner of the "Uply Founding Creators" space requested its
-- uploaded cover and about/gallery images be cleared so the branded default
-- cover renders instead.
--
-- Safety guarantees:
--   * UPDATE-only. NO rows are deleted anywhere.
--   * Scoped strictly to the single space named 'Uply Founding Creators'
--     (case-insensitive match) and its creator's gallery media.
--   * creator_spaces: ONLY cover_image_url is touched — name, description,
--     avatar, pricing, visibility and membership data are untouched.
--   * space_media: rows are preserved but their media URLs are blanked.
--     (space_media.url is TEXT NOT NULL, so '' is used instead of NULL; the
--     About tab filters out entries with an empty url, so nothing renders.)
-- ============================================================================

-- 1) Clear the space cover so DefaultCommunityCover takes over on the join card.
UPDATE public.creator_spaces
SET cover_image_url = NULL,
    updated_at = now()
WHERE name ILIKE 'Uply Founding Creators';

-- 2) Blank the about/gallery media for that space's creator (rows kept, no deletes).
UPDATE public.space_media
SET url = '',
    thumbnail_url = NULL,
    mux_playback_id = NULL
WHERE creator_id IN (
  SELECT creator_id
  FROM public.creator_spaces
  WHERE name ILIKE 'Uply Founding Creators'
);
