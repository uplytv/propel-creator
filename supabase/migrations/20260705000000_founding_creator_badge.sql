-- Founding Creator badge: explicit flag on profiles, backfilled to everyone
-- who is already on UPLY at migration time. New signups default to false.
-- Additive only; the column rides the existing profiles RLS policies.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founding_creator boolean NOT NULL DEFAULT false;

-- Everyone currently on the platform is a founding creator.
UPDATE public.profiles SET is_founding_creator = true;
