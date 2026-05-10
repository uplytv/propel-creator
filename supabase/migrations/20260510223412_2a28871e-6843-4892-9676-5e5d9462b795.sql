
CREATE TABLE public.music_setlist_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  show_label TEXT NOT NULL,
  show_date DATE,
  track_title TEXT NOT NULL,
  track_id UUID,
  notes TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked','played')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msc_artist ON public.music_setlist_candidates(artist_id);
CREATE INDEX idx_msc_show ON public.music_setlist_candidates(artist_id, show_label);

ALTER TABLE public.music_setlist_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view setlist candidates"
  ON public.music_setlist_candidates FOR SELECT USING (true);
CREATE POLICY "Artists insert own candidates"
  ON public.music_setlist_candidates FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own candidates"
  ON public.music_setlist_candidates FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artists delete own candidates"
  ON public.music_setlist_candidates FOR DELETE USING (auth.uid() = artist_id);

CREATE TRIGGER trg_msc_updated_at
  BEFORE UPDATE ON public.music_setlist_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_setlist_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.music_setlist_candidates(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, fan_id)
);

CREATE INDEX idx_msv_candidate ON public.music_setlist_votes(candidate_id);
CREATE INDEX idx_msv_fan ON public.music_setlist_votes(fan_id);

ALTER TABLE public.music_setlist_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view setlist votes"
  ON public.music_setlist_votes FOR SELECT USING (true);
CREATE POLICY "Fans insert own setlist votes"
  ON public.music_setlist_votes FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans delete own setlist votes"
  ON public.music_setlist_votes FOR DELETE USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_setlist_vote_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_setlist_candidates
      SET vote_count = vote_count + 1 WHERE id = NEW.candidate_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_setlist_candidates
      SET vote_count = GREATEST(0, vote_count - 1) WHERE id = OLD.candidate_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_msv_sync
  AFTER INSERT OR DELETE ON public.music_setlist_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_setlist_vote_count();
