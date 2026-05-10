
CREATE TABLE public.music_mailbag_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','hidden')),
  upvote_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mmq_artist ON public.music_mailbag_questions(artist_id);
CREATE INDEX idx_mmq_fan ON public.music_mailbag_questions(fan_id);
CREATE INDEX idx_mmq_status ON public.music_mailbag_questions(status);

ALTER TABLE public.music_mailbag_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views non-hidden mailbag"
  ON public.music_mailbag_questions FOR SELECT
  USING (status <> 'hidden' OR auth.uid() = artist_id OR auth.uid() = fan_id);
CREATE POLICY "Fans submit own mailbag questions"
  ON public.music_mailbag_questions FOR INSERT
  WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans update own pending mailbag"
  ON public.music_mailbag_questions FOR UPDATE
  USING (auth.uid() = fan_id AND status = 'pending');
CREATE POLICY "Artists moderate own mailbag"
  ON public.music_mailbag_questions FOR UPDATE
  USING (auth.uid() = artist_id);
CREATE POLICY "Fans delete own pending mailbag"
  ON public.music_mailbag_questions FOR DELETE
  USING (auth.uid() = fan_id AND status = 'pending');

CREATE TRIGGER trg_mmq_updated_at
  BEFORE UPDATE ON public.music_mailbag_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_mailbag_upvotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.music_mailbag_questions(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, fan_id)
);

CREATE INDEX idx_mmu_question ON public.music_mailbag_upvotes(question_id);
CREATE INDEX idx_mmu_fan ON public.music_mailbag_upvotes(fan_id);

ALTER TABLE public.music_mailbag_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views mailbag upvotes"
  ON public.music_mailbag_upvotes FOR SELECT USING (true);
CREATE POLICY "Fans upvote mailbag"
  ON public.music_mailbag_upvotes FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans remove own mailbag upvote"
  ON public.music_mailbag_upvotes FOR DELETE USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_mailbag_upvote_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_mailbag_questions
      SET upvote_count = upvote_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_mailbag_questions
      SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mmu_sync
  AFTER INSERT OR DELETE ON public.music_mailbag_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.sync_mailbag_upvote_count();
