
CREATE TABLE public.music_qa_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed')),
  question_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_qa_threads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mqt_artist ON public.music_qa_threads(artist_id);
CREATE INDEX idx_mqt_status ON public.music_qa_threads(status);
CREATE TRIGGER trg_mqt_updated_at BEFORE UPDATE ON public.music_qa_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "qa threads public view non-draft" ON public.music_qa_threads
  FOR SELECT USING (status <> 'draft' OR auth.uid() = artist_id);
CREATE POLICY "qa threads artist insert" ON public.music_qa_threads
  FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "qa threads artist update" ON public.music_qa_threads
  FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "qa threads artist delete" ON public.music_qa_threads
  FOR DELETE USING (auth.uid() = artist_id);

CREATE TABLE public.music_qa_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.music_qa_threads(id) ON DELETE CASCADE,
  asker_id UUID NOT NULL,
  body TEXT NOT NULL,
  upvote_count INT NOT NULL DEFAULT 0,
  answer_body TEXT,
  answered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_qa_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mqq_thread ON public.music_qa_questions(thread_id);
CREATE INDEX idx_mqq_asker ON public.music_qa_questions(asker_id);
CREATE TRIGGER trg_mqq_updated_at BEFORE UPDATE ON public.music_qa_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "qa questions public view visible" ON public.music_qa_questions
  FOR SELECT USING (
    status <> 'hidden'
    OR auth.uid() = asker_id
    OR EXISTS (SELECT 1 FROM public.music_qa_threads t WHERE t.id = thread_id AND t.artist_id = auth.uid())
  );
CREATE POLICY "qa questions fan insert" ON public.music_qa_questions
  FOR INSERT WITH CHECK (auth.uid() = asker_id);
CREATE POLICY "qa questions asker or artist update" ON public.music_qa_questions
  FOR UPDATE USING (
    auth.uid() = asker_id
    OR EXISTS (SELECT 1 FROM public.music_qa_threads t WHERE t.id = thread_id AND t.artist_id = auth.uid())
  );
CREATE POLICY "qa questions asker or artist delete" ON public.music_qa_questions
  FOR DELETE USING (
    auth.uid() = asker_id
    OR EXISTS (SELECT 1 FROM public.music_qa_threads t WHERE t.id = thread_id AND t.artist_id = auth.uid())
  );

CREATE TABLE public.music_qa_question_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.music_qa_questions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, voter_id)
);
ALTER TABLE public.music_qa_question_votes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mqqv_question ON public.music_qa_question_votes(question_id);
CREATE INDEX idx_mqqv_voter ON public.music_qa_question_votes(voter_id);

CREATE POLICY "qa votes public view" ON public.music_qa_question_votes
  FOR SELECT USING (true);
CREATE POLICY "qa votes self insert" ON public.music_qa_question_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "qa votes self delete" ON public.music_qa_question_votes
  FOR DELETE USING (auth.uid() = voter_id);

CREATE OR REPLACE FUNCTION public.sync_qa_question_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_qa_threads SET question_count = question_count + 1 WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_qa_threads SET question_count = GREATEST(question_count - 1, 0) WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_qa_question_counts
AFTER INSERT OR DELETE ON public.music_qa_questions
FOR EACH ROW EXECUTE FUNCTION public.sync_qa_question_counts();

CREATE OR REPLACE FUNCTION public.sync_qa_question_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_qa_questions SET upvote_count = upvote_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_qa_questions SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_qa_question_votes
AFTER INSERT OR DELETE ON public.music_qa_question_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_qa_question_votes();
