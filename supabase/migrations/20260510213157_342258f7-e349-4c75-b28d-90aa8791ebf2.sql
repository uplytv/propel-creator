
CREATE TABLE public.music_cover_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','reviewing','closed')),
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_cover_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mcr_artist ON public.music_cover_requests(artist_id);
CREATE INDEX idx_mcr_status ON public.music_cover_requests(status);
CREATE TRIGGER trg_mcr_updated_at BEFORE UPDATE ON public.music_cover_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public can view non-draft cover requests" ON public.music_cover_requests
  FOR SELECT USING (status <> 'draft' OR auth.uid() = artist_id);
CREATE POLICY "Artists manage own cover requests" ON public.music_cover_requests
  FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

CREATE TABLE public.music_cover_request_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.music_cover_requests(id) ON DELETE CASCADE,
  song_title TEXT NOT NULL,
  original_artist TEXT,
  notes TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  suggested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_cover_request_songs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mcrs_request ON public.music_cover_request_songs(request_id);
CREATE TRIGGER trg_mcrs_updated_at BEFORE UPDATE ON public.music_cover_request_songs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public can view songs for visible requests" ON public.music_cover_request_songs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.music_cover_requests r
    WHERE r.id = request_id AND (r.status <> 'draft' OR auth.uid() = r.artist_id)
  ));
CREATE POLICY "Fans can add cover song suggestions" ON public.music_cover_request_songs
  FOR INSERT WITH CHECK (auth.uid() = suggested_by);
CREATE POLICY "Suggesters can update own songs" ON public.music_cover_request_songs
  FOR UPDATE USING (auth.uid() = suggested_by);
CREATE POLICY "Artists manage cover request songs" ON public.music_cover_request_songs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.music_cover_requests r WHERE r.id = request_id AND r.artist_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.music_cover_requests r WHERE r.id = request_id AND r.artist_id = auth.uid()
  ));

CREATE TABLE public.music_cover_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.music_cover_requests(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.music_cover_request_songs(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(song_id, fan_id)
);
ALTER TABLE public.music_cover_request_votes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mcrv_request ON public.music_cover_request_votes(request_id);
CREATE INDEX idx_mcrv_fan ON public.music_cover_request_votes(fan_id);

CREATE POLICY "Public can view votes for visible requests" ON public.music_cover_request_votes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.music_cover_requests r
    WHERE r.id = request_id AND (r.status <> 'draft' OR auth.uid() = r.artist_id)
  ));
CREATE POLICY "Fans manage own cover request votes" ON public.music_cover_request_votes
  FOR ALL USING (auth.uid() = fan_id) WITH CHECK (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_cover_request_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_cover_request_songs SET vote_count = vote_count + 1 WHERE id = NEW.song_id;
    UPDATE public.music_cover_requests SET request_count = request_count + 1 WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_cover_request_songs SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.song_id;
    UPDATE public.music_cover_requests SET request_count = GREATEST(request_count - 1, 0) WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_cover_request_counts
AFTER INSERT OR DELETE ON public.music_cover_request_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_cover_request_counts();
