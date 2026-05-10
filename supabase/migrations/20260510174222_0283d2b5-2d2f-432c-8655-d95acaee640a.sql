
CREATE TABLE public.music_cover_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  track_title TEXT NOT NULL,
  prompt TEXT,
  prize TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','judging','closed')),
  submission_deadline TIMESTAMPTZ,
  max_submissions INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_cover_contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mcc_public_view" ON public.music_cover_contests FOR SELECT USING (true);
CREATE POLICY "mcc_artist_insert" ON public.music_cover_contests FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "mcc_artist_update" ON public.music_cover_contests FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "mcc_artist_delete" ON public.music_cover_contests FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mcc_updated_at BEFORE UPDATE ON public.music_cover_contests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_mcc_artist ON public.music_cover_contests(artist_id, status);

CREATE TABLE public.music_cover_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.music_cover_contests(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','finalist','winner','disqualified')),
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_cover_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mcs_public_view" ON public.music_cover_submissions FOR SELECT USING (status <> 'disqualified');
CREATE POLICY "mcs_fan_view_own" ON public.music_cover_submissions FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "mcs_artist_view" ON public.music_cover_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.music_cover_contests c WHERE c.id = contest_id AND c.artist_id = auth.uid())
);
CREATE POLICY "mcs_fan_insert" ON public.music_cover_submissions FOR INSERT WITH CHECK (
  auth.uid() = fan_id
  AND EXISTS (SELECT 1 FROM public.music_cover_contests c WHERE c.id = contest_id AND c.status = 'open')
);
CREATE POLICY "mcs_fan_update" ON public.music_cover_submissions FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "mcs_fan_delete" ON public.music_cover_submissions FOR DELETE USING (auth.uid() = fan_id);
CREATE POLICY "mcs_artist_update" ON public.music_cover_submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.music_cover_contests c WHERE c.id = contest_id AND c.artist_id = auth.uid())
);
CREATE TRIGGER trg_mcs_updated_at BEFORE UPDATE ON public.music_cover_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_mcs_contest ON public.music_cover_submissions(contest_id, like_count DESC);

CREATE TABLE public.music_cover_submission_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.music_cover_submissions(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, fan_id)
);
ALTER TABLE public.music_cover_submission_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mcsl_public_view" ON public.music_cover_submission_likes FOR SELECT USING (true);
CREATE POLICY "mcsl_fan_insert" ON public.music_cover_submission_likes FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "mcsl_fan_delete" ON public.music_cover_submission_likes FOR DELETE USING (auth.uid() = fan_id);
CREATE INDEX idx_mcsl_submission ON public.music_cover_submission_likes(submission_id);

CREATE OR REPLACE FUNCTION public.sync_cover_submission_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid UUID;
BEGIN
  sid := COALESCE(NEW.submission_id, OLD.submission_id);
  UPDATE public.music_cover_submissions
  SET like_count = (SELECT COUNT(*) FROM public.music_cover_submission_likes WHERE submission_id = sid)
  WHERE id = sid;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_mcsl_sync
  AFTER INSERT OR DELETE ON public.music_cover_submission_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_cover_submission_likes();
