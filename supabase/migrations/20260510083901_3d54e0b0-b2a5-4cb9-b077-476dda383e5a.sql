
CREATE TABLE public.music_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'remix',
  prompt TEXT,
  stems_url TEXT,
  prize_description TEXT,
  prize_cents INTEGER NOT NULL DEFAULT 0,
  artwork_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submission_deadline TIMESTAMPTZ,
  voting_deadline TIMESTAMPTZ,
  entry_count INTEGER NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_challenge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.music_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  artwork_url TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  is_disqualified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_challenge_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.music_challenges(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.music_challenge_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entry_id, user_id)
);

CREATE INDEX idx_music_challenges_status ON public.music_challenges(status, submission_deadline);
CREATE INDEX idx_music_challenge_entries_challenge ON public.music_challenge_entries(challenge_id, score DESC);
CREATE INDEX idx_music_challenge_entries_user ON public.music_challenge_entries(user_id);
CREATE INDEX idx_music_challenge_votes_user ON public.music_challenge_votes(user_id);

ALTER TABLE public.music_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_challenge_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are public"
  ON public.music_challenges FOR SELECT USING (true);

CREATE POLICY "Hosts manage challenges"
  ON public.music_challenges FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Entries are public"
  ON public.music_challenge_entries FOR SELECT USING (is_disqualified = false OR auth.uid() = user_id);

CREATE POLICY "Users insert own entries"
  ON public.music_challenge_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own entries"
  ON public.music_challenge_entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own entries"
  ON public.music_challenge_entries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own votes"
  ON public.music_challenge_votes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users cast own votes"
  ON public.music_challenge_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own votes"
  ON public.music_challenge_votes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_music_challenges_updated_at
  BEFORE UPDATE ON public.music_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_music_challenge_entries_updated_at
  BEFORE UPDATE ON public.music_challenge_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_challenge_entry_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_challenges SET entry_count = entry_count + 1 WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_challenges SET entry_count = GREATEST(entry_count - 1, 0) WHERE id = OLD.challenge_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_challenge_entry_count
  AFTER INSERT OR DELETE ON public.music_challenge_entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_challenge_entry_count();

CREATE OR REPLACE FUNCTION public.cast_challenge_vote(_entry_id UUID, _weight NUMERIC DEFAULT 1.0)
RETURNS public.music_challenge_votes LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _entry public.music_challenge_entries;
  _challenge public.music_challenges;
  _vote public.music_challenge_votes;
  _user UUID := auth.uid();
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _entry FROM public.music_challenge_entries WHERE id = _entry_id FOR UPDATE;
  IF _entry IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF _entry.user_id = _user THEN RAISE EXCEPTION 'Cannot vote for your own entry'; END IF;
  SELECT * INTO _challenge FROM public.music_challenges WHERE id = _entry.challenge_id;
  IF _challenge.status NOT IN ('active','judging') THEN RAISE EXCEPTION 'Voting is closed'; END IF;

  INSERT INTO public.music_challenge_votes (challenge_id, entry_id, user_id, weight)
  VALUES (_entry.challenge_id, _entry_id, _user, GREATEST(_weight, 0.1))
  RETURNING * INTO _vote;

  UPDATE public.music_challenge_entries
    SET vote_count = vote_count + 1,
        score = score + GREATEST(_weight, 0.1)
    WHERE id = _entry_id;
  UPDATE public.music_challenges
    SET vote_count = vote_count + 1
    WHERE id = _entry.challenge_id;

  RETURN _vote;
END;
$$;

CREATE OR REPLACE FUNCTION public.challenge_leaderboard(_challenge_id UUID, _limit INTEGER DEFAULT 50)
RETURNS TABLE (
  rank BIGINT,
  entry_id UUID,
  user_id UUID,
  title TEXT,
  artwork_url TEXT,
  vote_count INTEGER,
  score NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY e.score DESC, e.created_at ASC) AS rank,
    e.id AS entry_id,
    e.user_id,
    e.title,
    e.artwork_url,
    e.vote_count,
    e.score
  FROM public.music_challenge_entries e
  WHERE e.challenge_id = _challenge_id AND e.is_disqualified = false
  ORDER BY e.score DESC, e.created_at ASC
  LIMIT _limit;
$$;
