
CREATE TABLE IF NOT EXISTS public.music_demo_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  fan_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  genre text,
  duration_seconds integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','listened','shortlisted','passed')),
  feedback text,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mds_artist ON public.music_demo_submissions(artist_id);
CREATE INDEX IF NOT EXISTS idx_mds_fan ON public.music_demo_submissions(fan_id);
CREATE INDEX IF NOT EXISTS idx_mds_status ON public.music_demo_submissions(status);

ALTER TABLE public.music_demo_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fans view own demo submissions" ON public.music_demo_submissions;
CREATE POLICY "Fans view own demo submissions" ON public.music_demo_submissions
  FOR SELECT USING (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Artists view inbox" ON public.music_demo_submissions;
CREATE POLICY "Artists view inbox" ON public.music_demo_submissions
  FOR SELECT USING (auth.uid() = artist_id);

DROP POLICY IF EXISTS "Public view featured demos" ON public.music_demo_submissions;
CREATE POLICY "Public view featured demos" ON public.music_demo_submissions
  FOR SELECT USING (is_featured = true);

DROP POLICY IF EXISTS "Fans submit demos" ON public.music_demo_submissions;
CREATE POLICY "Fans submit demos" ON public.music_demo_submissions
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Fans update own demos" ON public.music_demo_submissions;
CREATE POLICY "Fans update own demos" ON public.music_demo_submissions
  FOR UPDATE USING (auth.uid() = fan_id AND status = 'pending');

DROP POLICY IF EXISTS "Artists review demos" ON public.music_demo_submissions;
CREATE POLICY "Artists review demos" ON public.music_demo_submissions
  FOR UPDATE USING (auth.uid() = artist_id);

CREATE OR REPLACE FUNCTION public.update_mds_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_mds_updated_at ON public.music_demo_submissions;
CREATE TRIGGER trg_mds_updated_at
BEFORE UPDATE ON public.music_demo_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_mds_updated_at();
