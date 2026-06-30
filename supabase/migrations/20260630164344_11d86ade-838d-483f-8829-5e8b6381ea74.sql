
ALTER TABLE public.music_challenges
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS host_display_name text,
  ADD COLUMN IF NOT EXISTS rules text;
CREATE UNIQUE INDEX IF NOT EXISTS music_challenges_slug_key ON public.music_challenges(slug) WHERE slug IS NOT NULL;
ALTER TABLE public.music_challenges ALTER COLUMN host_id DROP NOT NULL;

ALTER TABLE public.music_challenge_entries
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderation_notes text;
ALTER TABLE public.music_challenge_entries ALTER COLUMN media_url DROP NOT NULL;

ALTER TABLE public.music_challenge_entries DROP CONSTRAINT IF EXISTS music_challenge_entries_has_media;
ALTER TABLE public.music_challenge_entries
  ADD CONSTRAINT music_challenge_entries_has_media
  CHECK (media_url IS NOT NULL OR external_url IS NOT NULL);

ALTER TABLE public.music_challenge_entries DROP CONSTRAINT IF EXISTS music_challenge_entries_moderation_status_check;
ALTER TABLE public.music_challenge_entries
  ADD CONSTRAINT music_challenge_entries_moderation_status_check
  CHECK (moderation_status IN ('pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS music_challenge_entries_challenge_status_idx
  ON public.music_challenge_entries(challenge_id, moderation_status);

ALTER TABLE public.music_challenge_votes
  ADD COLUMN IF NOT EXISTS is_super boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits_spent integer NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS music_challenge_votes_unique_free;
CREATE UNIQUE INDEX music_challenge_votes_unique_free
  ON public.music_challenge_votes(entry_id, user_id)
  WHERE is_super = false;

DROP FUNCTION IF EXISTS public.challenge_leaderboard(uuid, integer);
CREATE FUNCTION public.challenge_leaderboard(_challenge_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE (
  entry_id uuid,
  user_id uuid,
  title text,
  artwork_url text,
  media_url text,
  external_url text,
  country text,
  vote_count integer,
  score numeric,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.user_id,
    e.title,
    e.artwork_url,
    e.media_url,
    e.external_url,
    e.country,
    e.vote_count,
    e.score,
    RANK() OVER (ORDER BY e.score DESC, e.vote_count DESC, e.created_at ASC) AS rank
  FROM public.music_challenge_entries e
  WHERE e.challenge_id = _challenge_id
    AND e.is_disqualified = false
    AND e.moderation_status = 'approved'
  ORDER BY e.score DESC, e.vote_count DESC, e.created_at ASC
  LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.cast_challenge_vote(_entry_id uuid, _weight numeric DEFAULT 1.0)
RETURNS public.music_challenge_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entry public.music_challenge_entries;
  _challenge public.music_challenges;
  _vote public.music_challenge_votes;
  _user UUID := auth.uid();
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _entry FROM public.music_challenge_entries WHERE id = _entry_id FOR UPDATE;
  IF _entry IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF _entry.moderation_status <> 'approved' THEN RAISE EXCEPTION 'Entry not yet approved'; END IF;
  IF _entry.user_id = _user THEN RAISE EXCEPTION 'Cannot vote for your own entry'; END IF;
  SELECT * INTO _challenge FROM public.music_challenges WHERE id = _entry.challenge_id;
  IF _challenge.status NOT IN ('active','judging') THEN RAISE EXCEPTION 'Voting is closed'; END IF;

  INSERT INTO public.music_challenge_votes (challenge_id, entry_id, user_id, weight, is_super, credits_spent)
  VALUES (_entry.challenge_id, _entry_id, _user, GREATEST(_weight, 0.1), false, 0)
  RETURNING * INTO _vote;

  UPDATE public.music_challenge_entries
    SET vote_count = vote_count + 1, score = score + GREATEST(_weight, 0.1)
    WHERE id = _entry_id;
  UPDATE public.music_challenges
    SET vote_count = vote_count + 1
    WHERE id = _entry.challenge_id;

  RETURN _vote;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_vote_challenge_entry(_entry_id uuid, _credits integer)
RETURNS public.music_challenge_votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entry public.music_challenge_entries;
  _challenge public.music_challenges;
  _vote public.music_challenge_votes;
  _user UUID := auth.uid();
  _balance integer;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _credits IS NULL OR _credits < 1 THEN RAISE EXCEPTION 'Must spend at least 1 credit'; END IF;
  IF _credits > 1000 THEN RAISE EXCEPTION 'Maximum 1000 credits per super vote'; END IF;

  SELECT * INTO _entry FROM public.music_challenge_entries WHERE id = _entry_id FOR UPDATE;
  IF _entry IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF _entry.moderation_status <> 'approved' THEN RAISE EXCEPTION 'Entry not yet approved'; END IF;
  IF _entry.user_id = _user THEN RAISE EXCEPTION 'Cannot vote for your own entry'; END IF;
  SELECT * INTO _challenge FROM public.music_challenges WHERE id = _entry.challenge_id;
  IF _challenge.status NOT IN ('active','judging') THEN RAISE EXCEPTION 'Voting is closed'; END IF;

  UPDATE public.wallets
    SET credits = credits - _credits
    WHERE user_id = _user AND credits >= _credits
    RETURNING credits INTO _balance;
  IF _balance IS NULL THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  INSERT INTO public.music_challenge_votes (challenge_id, entry_id, user_id, weight, is_super, credits_spent)
  VALUES (_entry.challenge_id, _entry_id, _user, _credits::numeric, true, _credits)
  RETURNING * INTO _vote;

  UPDATE public.music_challenge_entries
    SET vote_count = vote_count + 1, score = score + _credits::numeric
    WHERE id = _entry_id;
  UPDATE public.music_challenges
    SET vote_count = vote_count + 1
    WHERE id = _entry.challenge_id;

  RETURN _vote;
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_vote_challenge_entry(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_challenge_vote(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.challenge_leaderboard(uuid, integer) TO anon, authenticated;

INSERT INTO public.music_challenges (
  host_id, title, slug, description, challenge_type, prompt, prize_description,
  status, starts_at, submission_deadline, voting_deadline,
  host_display_name, rules
)
SELECT
  NULL,
  'Omid Global Talent Search',
  'omid-global-talent-search',
  'A worldwide call for vocalists and musicians from Iranian maestro Omid. Submit your best performance and let the world vote on the next great voice — discovered, mentored, and amplified by UPLY.',
  'vocal',
  'Show us your voice. A song, a moment, a feeling. Persian, English, original or cover — we want to hear what makes you unmistakably you.',
  'Mentorship session with Omid, featured concert spotlight, and a global release on UPLY.',
  'active',
  now(),
  now() + interval '90 days',
  now() + interval '120 days',
  'Omid',
  E'• One entry per artist.\n• Original performances or covers welcome.\n• Audio or video up to 5 minutes.\n• Family-friendly. No backing tracks lip-sync.\n• Entries are reviewed before going live.'
WHERE NOT EXISTS (SELECT 1 FROM public.music_challenges WHERE slug = 'omid-global-talent-search');
