-- Section 5: separate landing-layout selector from marketing creator_type
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creator_layout text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_creator_layout_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_creator_layout_check
  CHECK (creator_layout IS NULL OR creator_layout IN
    ('musician','visual_artist','content_creator','filmmaker','podcaster','dj_producer','generic'));

-- Backfill: existing musicians get the musician layout so nothing visually changes for them
UPDATE public.profiles
SET creator_layout = 'musician'
WHERE creator_layout IS NULL
  AND lower(coalesce(creator_type, '')) IN ('music', 'musician');
