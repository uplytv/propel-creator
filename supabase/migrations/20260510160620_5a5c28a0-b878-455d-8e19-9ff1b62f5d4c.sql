
CREATE TABLE public.music_remix_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  stems_url text,
  cover_url text,
  prize_description text,
  prize_amount_cents integer DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  submission_deadline timestamptz,
  voting_deadline timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','voting','completed','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mrc_artist ON public.music_remix_contests(artist_id);
CREATE INDEX idx_mrc_status ON public.music_remix_contests(status);
ALTER TABLE public.music_remix_contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views contests" ON public.music_remix_contests FOR SELECT USING (true);
CREATE POLICY "Artist creates contests" ON public.music_remix_contests FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artist updates own contests" ON public.music_remix_contests FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artist deletes own contests" ON public.music_remix_contests FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mrc_updated_at BEFORE UPDATE ON public.music_remix_contests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_remix_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.music_remix_contests(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL,
  title text NOT NULL,
  audio_url text NOT NULL,
  notes text,
  vote_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected','winner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mrs_contest ON public.music_remix_submissions(contest_id);
CREATE INDEX idx_mrs_fan ON public.music_remix_submissions(fan_id);
ALTER TABLE public.music_remix_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views submissions" ON public.music_remix_submissions FOR SELECT USING (true);
CREATE POLICY "Fan submits remix" ON public.music_remix_submissions FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fan updates own submission" ON public.music_remix_submissions FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "Fan deletes own submission" ON public.music_remix_submissions FOR DELETE USING (auth.uid() = fan_id);
CREATE TRIGGER trg_mrs_updated_at BEFORE UPDATE ON public.music_remix_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_remix_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.music_remix_contests(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.music_remix_submissions(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contest_id, voter_id)
);
CREATE INDEX idx_mrv_submission ON public.music_remix_votes(submission_id);
ALTER TABLE public.music_remix_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views votes" ON public.music_remix_votes FOR SELECT USING (true);
CREATE POLICY "Voter casts own vote" ON public.music_remix_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "Voter deletes own vote" ON public.music_remix_votes FOR DELETE USING (auth.uid() = voter_id);

CREATE OR REPLACE FUNCTION public.update_remix_vote_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_remix_submissions SET vote_count = vote_count + 1 WHERE id = NEW.submission_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_remix_submissions SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.submission_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_mrv_count AFTER INSERT OR DELETE ON public.music_remix_votes FOR EACH ROW EXECUTE FUNCTION public.update_remix_vote_count();
