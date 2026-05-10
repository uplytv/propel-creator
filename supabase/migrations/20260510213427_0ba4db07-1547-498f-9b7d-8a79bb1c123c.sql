
CREATE TABLE public.music_fan_spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed')),
  submission_count INTEGER NOT NULL DEFAULT 0,
  featured_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_fan_spotlights ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mfsp_artist ON public.music_fan_spotlights(artist_id);
CREATE INDEX idx_mfsp_status ON public.music_fan_spotlights(status);
CREATE TRIGGER trg_mfsp_updated_at BEFORE UPDATE ON public.music_fan_spotlights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public can view non-draft spotlights" ON public.music_fan_spotlights
  FOR SELECT USING (status <> 'draft' OR auth.uid() = artist_id);
CREATE POLICY "Artists manage own spotlights" ON public.music_fan_spotlights
  FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

CREATE TABLE public.music_fan_spotlight_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotlight_id UUID NOT NULL REFERENCES public.music_fan_spotlights(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('cover','remix','art','video')),
  media_url TEXT NOT NULL,
  title TEXT,
  caption TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_fan_spotlight_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mfss_spotlight ON public.music_fan_spotlight_submissions(spotlight_id);
CREATE INDEX idx_mfss_fan ON public.music_fan_spotlight_submissions(fan_id);
CREATE TRIGGER trg_mfss_updated_at BEFORE UPDATE ON public.music_fan_spotlight_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public view approved submissions" ON public.music_fan_spotlight_submissions
  FOR SELECT USING (
    status = 'approved'
    OR auth.uid() = fan_id
    OR EXISTS (SELECT 1 FROM public.music_fan_spotlights s WHERE s.id = spotlight_id AND s.artist_id = auth.uid())
  );
CREATE POLICY "Fans submit own" ON public.music_fan_spotlight_submissions
  FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans update own" ON public.music_fan_spotlight_submissions
  FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "Fans delete own" ON public.music_fan_spotlight_submissions
  FOR DELETE USING (auth.uid() = fan_id);
CREATE POLICY "Artists manage submissions" ON public.music_fan_spotlight_submissions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.music_fan_spotlights s WHERE s.id = spotlight_id AND s.artist_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.music_fan_spotlights s WHERE s.id = spotlight_id AND s.artist_id = auth.uid()
  ));

CREATE TABLE public.music_fan_spotlight_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.music_fan_spotlight_submissions(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, fan_id)
);
ALTER TABLE public.music_fan_spotlight_likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mfsl_submission ON public.music_fan_spotlight_likes(submission_id);
CREATE INDEX idx_mfsl_fan ON public.music_fan_spotlight_likes(fan_id);

CREATE POLICY "Public view spotlight likes" ON public.music_fan_spotlight_likes
  FOR SELECT USING (true);
CREATE POLICY "Fans manage own spotlight likes" ON public.music_fan_spotlight_likes
  FOR ALL USING (auth.uid() = fan_id) WITH CHECK (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_fan_spotlight_submission_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_fan_spotlights SET submission_count = submission_count + 1 WHERE id = NEW.spotlight_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_fan_spotlights SET submission_count = GREATEST(submission_count - 1, 0) WHERE id = OLD.spotlight_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_featured IS DISTINCT FROM NEW.is_featured THEN
      IF NEW.is_featured THEN
        UPDATE public.music_fan_spotlights SET featured_count = featured_count + 1 WHERE id = NEW.spotlight_id;
      ELSE
        UPDATE public.music_fan_spotlights SET featured_count = GREATEST(featured_count - 1, 0) WHERE id = NEW.spotlight_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_fan_spotlight_submission_count
AFTER INSERT OR UPDATE OR DELETE ON public.music_fan_spotlight_submissions
FOR EACH ROW EXECUTE FUNCTION public.sync_fan_spotlight_submission_count();

CREATE OR REPLACE FUNCTION public.sync_fan_spotlight_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_fan_spotlight_submissions SET like_count = like_count + 1 WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_fan_spotlight_submissions SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_fan_spotlight_likes
AFTER INSERT OR DELETE ON public.music_fan_spotlight_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_fan_spotlight_likes();
