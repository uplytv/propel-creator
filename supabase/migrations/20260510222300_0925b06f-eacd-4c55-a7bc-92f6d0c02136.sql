
CREATE TABLE IF NOT EXISTS public.music_trivia_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  time_limit_seconds integer,
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mtq_artist ON public.music_trivia_quizzes(artist_id);
CREATE INDEX IF NOT EXISTS idx_mtq_status ON public.music_trivia_quizzes(status);

ALTER TABLE public.music_trivia_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view published quizzes" ON public.music_trivia_quizzes;
CREATE POLICY "Public view published quizzes" ON public.music_trivia_quizzes
  FOR SELECT USING (status <> 'draft');

DROP POLICY IF EXISTS "Artists manage own quizzes" ON public.music_trivia_quizzes;
CREATE POLICY "Artists manage own quizzes" ON public.music_trivia_quizzes
  FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

CREATE TABLE IF NOT EXISTS public.music_trivia_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.music_trivia_quizzes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  prompt text NOT NULL,
  choices text[] NOT NULL CHECK (array_length(choices, 1) BETWEEN 2 AND 6),
  correct_index integer NOT NULL CHECK (correct_index >= 0),
  points integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mtqn_quiz ON public.music_trivia_questions(quiz_id, position);

ALTER TABLE public.music_trivia_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view questions of public quiz" ON public.music_trivia_questions;
CREATE POLICY "Public view questions of public quiz" ON public.music_trivia_questions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.music_trivia_quizzes q
    WHERE q.id = quiz_id AND q.status <> 'draft'
  ));

DROP POLICY IF EXISTS "Artists manage own questions" ON public.music_trivia_questions;
CREATE POLICY "Artists manage own questions" ON public.music_trivia_questions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.music_trivia_quizzes q
    WHERE q.id = quiz_id AND q.artist_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.music_trivia_quizzes q
    WHERE q.id = quiz_id AND q.artist_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.music_trivia_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.music_trivia_quizzes(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mta_quiz ON public.music_trivia_attempts(quiz_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_mta_fan ON public.music_trivia_attempts(fan_id);

ALTER TABLE public.music_trivia_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view leaderboard" ON public.music_trivia_attempts;
CREATE POLICY "Public view leaderboard" ON public.music_trivia_attempts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Fans insert own attempts" ON public.music_trivia_attempts;
CREATE POLICY "Fans insert own attempts" ON public.music_trivia_attempts
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_trivia_attempt_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.music_trivia_quizzes
    SET attempt_count = attempt_count + 1, updated_at = now()
    WHERE id = NEW.quiz_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mta_sync ON public.music_trivia_attempts;
CREATE TRIGGER trg_mta_sync
AFTER INSERT ON public.music_trivia_attempts
FOR EACH ROW EXECUTE FUNCTION public.sync_trivia_attempt_count();

CREATE OR REPLACE FUNCTION public.update_mtq_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_mtq_updated_at ON public.music_trivia_quizzes;
CREATE TRIGGER trg_mtq_updated_at
BEFORE UPDATE ON public.music_trivia_quizzes
FOR EACH ROW EXECUTE FUNCTION public.update_mtq_updated_at();
