
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS is_highlight boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS highlight_title text,
  ADD COLUMN IF NOT EXISTS highlight_cover_url text;

CREATE INDEX IF NOT EXISTS idx_stories_user_highlight
  ON public.stories(user_id) WHERE is_highlight = true;

ALTER TABLE public.artist_profiles
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text;
