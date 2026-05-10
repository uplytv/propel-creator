CREATE TABLE public.music_ama_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','live','ended','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mas_artist ON public.music_ama_sessions(artist_id);
CREATE INDEX idx_mas_status ON public.music_ama_sessions(status);

ALTER TABLE public.music_ama_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view non-draft sessions"
ON public.music_ama_sessions FOR SELECT
USING (status <> 'draft');

CREATE POLICY "Artists view own sessions"
ON public.music_ama_sessions FOR SELECT
USING (auth.uid() = artist_id);

CREATE POLICY "Artists insert own sessions"
ON public.music_ama_sessions FOR INSERT
WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists update own sessions"
ON public.music_ama_sessions FOR UPDATE
USING (auth.uid() = artist_id);

CREATE POLICY "Artists delete own sessions"
ON public.music_ama_sessions FOR DELETE
USING (auth.uid() = artist_id);

CREATE TRIGGER trg_mas_updated_at
BEFORE UPDATE ON public.music_ama_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_ama_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.music_ama_sessions(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  question TEXT NOT NULL,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maq_session ON public.music_ama_questions(session_id);
CREATE INDEX idx_maq_fan ON public.music_ama_questions(fan_id);

ALTER TABLE public.music_ama_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view questions"
ON public.music_ama_questions FOR SELECT
USING (true);

CREATE POLICY "Fans submit questions"
ON public.music_ama_questions FOR INSERT
WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Fans edit own questions"
ON public.music_ama_questions FOR UPDATE
USING (auth.uid() = fan_id);

CREATE POLICY "Artists answer questions on own sessions"
ON public.music_ama_questions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.music_ama_sessions s
  WHERE s.id = music_ama_questions.session_id AND s.artist_id = auth.uid()
));

CREATE POLICY "Fans delete own questions"
ON public.music_ama_questions FOR DELETE
USING (auth.uid() = fan_id);

CREATE TRIGGER trg_maq_updated_at
BEFORE UPDATE ON public.music_ama_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_ama_question_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.music_ama_questions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, voter_id)
);

CREATE INDEX idx_maqv_question ON public.music_ama_question_votes(question_id);

ALTER TABLE public.music_ama_question_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view votes"
ON public.music_ama_question_votes FOR SELECT
USING (true);

CREATE POLICY "Voters create own votes"
ON public.music_ama_question_votes FOR INSERT
WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Voters delete own votes"
ON public.music_ama_question_votes FOR DELETE
USING (auth.uid() = voter_id);

CREATE OR REPLACE FUNCTION public.update_ama_question_upvotes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.music_ama_questions
      SET upvote_count = upvote_count + 1
      WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.music_ama_questions
      SET upvote_count = GREATEST(0, upvote_count - 1)
      WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_maqv_count
AFTER INSERT OR DELETE ON public.music_ama_question_votes
FOR EACH ROW EXECUTE FUNCTION public.update_ama_question_upvotes();