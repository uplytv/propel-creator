CREATE TABLE IF NOT EXISTS public.dj_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  recording_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  target_bpm NUMERIC(6,2),
  is_public BOOLEAN NOT NULL DEFAULT true,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dj_sessions_user ON public.dj_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dj_sessions_public ON public.dj_sessions(is_public, created_at DESC) WHERE is_public = true;
ALTER TABLE public.dj_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DJSess: public read" ON public.dj_sessions FOR SELECT USING (is_public OR auth.uid() = user_id);
CREATE POLICY "DJSess: owner insert" ON public.dj_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "DJSess: owner update" ON public.dj_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "DJSess: owner delete" ON public.dj_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER dj_sessions_updated_at BEFORE UPDATE ON public.dj_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.dj_session_cues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.dj_sessions(id) ON DELETE CASCADE,
  at_seconds INTEGER NOT NULL CHECK (at_seconds >= 0),
  deck TEXT NOT NULL CHECK (deck IN ('A','B','MIX')),
  label TEXT,
  track_url TEXT,
  track_title TEXT,
  bpm NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cues_session ON public.dj_session_cues(session_id, at_seconds);
ALTER TABLE public.dj_session_cues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DJCues: public read" ON public.dj_session_cues FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.dj_sessions s WHERE s.id = session_id AND (s.is_public OR s.user_id = auth.uid())));
CREATE POLICY "DJCues: owner manage" ON public.dj_session_cues FOR ALL
  USING (EXISTS (SELECT 1 FROM public.dj_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dj_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));