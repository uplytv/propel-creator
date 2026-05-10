
CREATE TABLE public.music_artist_qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  body TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','hidden')),
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_artist_qa_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maqq_public_view" ON public.music_artist_qa_questions FOR SELECT USING (status <> 'hidden');
CREATE POLICY "maqq_artist_view_all" ON public.music_artist_qa_questions FOR SELECT USING (auth.uid() = artist_id);
CREATE POLICY "maqq_fan_view_own" ON public.music_artist_qa_questions FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "maqq_fan_insert" ON public.music_artist_qa_questions FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "maqq_fan_delete" ON public.music_artist_qa_questions FOR DELETE USING (auth.uid() = fan_id);
CREATE POLICY "maqq_artist_update" ON public.music_artist_qa_questions FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "maqq_artist_delete" ON public.music_artist_qa_questions FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_maqq_updated_at BEFORE UPDATE ON public.music_artist_qa_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_maqq_artist ON public.music_artist_qa_questions(artist_id, status, created_at DESC);

CREATE TABLE public.music_artist_qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL UNIQUE REFERENCES public.music_artist_qa_questions(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_artist_qa_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maqa_public_view" ON public.music_artist_qa_answers FOR SELECT USING (true);
CREATE POLICY "maqa_artist_insert" ON public.music_artist_qa_answers FOR INSERT WITH CHECK (
  auth.uid() = artist_id AND EXISTS (
    SELECT 1 FROM public.music_artist_qa_questions q WHERE q.id = question_id AND q.artist_id = auth.uid()
  )
);
CREATE POLICY "maqa_artist_update" ON public.music_artist_qa_answers FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "maqa_artist_delete" ON public.music_artist_qa_answers FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_maqa_updated_at BEFORE UPDATE ON public.music_artist_qa_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_artist_qa_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.music_artist_qa_questions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, voter_id)
);
ALTER TABLE public.music_artist_qa_upvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maqu_public_view" ON public.music_artist_qa_upvotes FOR SELECT USING (true);
CREATE POLICY "maqu_voter_insert" ON public.music_artist_qa_upvotes FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "maqu_voter_delete" ON public.music_artist_qa_upvotes FOR DELETE USING (auth.uid() = voter_id);
CREATE INDEX idx_maqu_q ON public.music_artist_qa_upvotes(question_id);

CREATE OR REPLACE FUNCTION public.sync_qa_question_upvotes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE qid UUID;
BEGIN
  qid := COALESCE(NEW.question_id, OLD.question_id);
  UPDATE public.music_artist_qa_questions
  SET upvotes = (SELECT COUNT(*) FROM public.music_artist_qa_upvotes WHERE question_id = qid)
  WHERE id = qid;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_maqu_sync
  AFTER INSERT OR DELETE ON public.music_artist_qa_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.sync_qa_question_upvotes();

CREATE OR REPLACE FUNCTION public.mark_qa_question_answered()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.music_artist_qa_questions
  SET status = 'answered'
  WHERE id = NEW.question_id AND status <> 'hidden';
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_maqa_mark_answered
  AFTER INSERT ON public.music_artist_qa_answers
  FOR EACH ROW EXECUTE FUNCTION public.mark_qa_question_answered();
