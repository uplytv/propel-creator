
CREATE TABLE public.music_fan_demo_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  title TEXT NOT NULL,
  genre TEXT,
  audio_url TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','featured','declined')),
  artist_feedback TEXT,
  feedback_at TIMESTAMPTZ,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfds_artist ON public.music_fan_demo_submissions(artist_id, created_at DESC);
CREATE INDEX idx_mfds_fan ON public.music_fan_demo_submissions(fan_id, created_at DESC);
CREATE INDEX idx_mfds_status ON public.music_fan_demo_submissions(status);

ALTER TABLE public.music_fan_demo_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view featured demos"
ON public.music_fan_demo_submissions FOR SELECT
USING (status = 'featured');

CREATE POLICY "Artists can view their demos"
ON public.music_fan_demo_submissions FOR SELECT
USING (auth.uid() = artist_id);

CREATE POLICY "Fans can view their own demos"
ON public.music_fan_demo_submissions FOR SELECT
USING (auth.uid() = fan_id);

CREATE POLICY "Fans can submit demos"
ON public.music_fan_demo_submissions FOR INSERT
WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Artists can update demos sent to them"
ON public.music_fan_demo_submissions FOR UPDATE
USING (auth.uid() = artist_id);

CREATE POLICY "Fans can delete their pending demos"
ON public.music_fan_demo_submissions FOR DELETE
USING (auth.uid() = fan_id AND status = 'pending');

CREATE TRIGGER trg_mfds_updated_at
BEFORE UPDATE ON public.music_fan_demo_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_fan_demo_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.music_fan_demo_submissions(id) ON DELETE CASCADE,
  listener_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, listener_id)
);

CREATE INDEX idx_mfdp_submission ON public.music_fan_demo_plays(submission_id);

ALTER TABLE public.music_fan_demo_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listeners can record their plays"
ON public.music_fan_demo_plays FOR INSERT
WITH CHECK (auth.uid() = listener_id);

CREATE POLICY "Listeners can view their plays"
ON public.music_fan_demo_plays FOR SELECT
USING (auth.uid() = listener_id);

CREATE OR REPLACE FUNCTION public.sync_fan_demo_play_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.music_fan_demo_submissions
  SET play_count = play_count + 1
  WHERE id = NEW.submission_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mfdp_play_count
AFTER INSERT ON public.music_fan_demo_plays
FOR EACH ROW EXECUTE FUNCTION public.sync_fan_demo_play_count();
