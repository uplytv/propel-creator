CREATE TABLE public.music_setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  show_title TEXT NOT NULL,
  venue TEXT,
  show_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msl_artist ON public.music_setlists(artist_id);
CREATE INDEX idx_msl_date ON public.music_setlists(show_date);

ALTER TABLE public.music_setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view published setlists"
ON public.music_setlists FOR SELECT
USING (is_published = true);

CREATE POLICY "Artists view own setlists"
ON public.music_setlists FOR SELECT
USING (auth.uid() = artist_id);

CREATE POLICY "Artists manage own setlists insert"
ON public.music_setlists FOR INSERT
WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists manage own setlists update"
ON public.music_setlists FOR UPDATE
USING (auth.uid() = artist_id);

CREATE POLICY "Artists manage own setlists delete"
ON public.music_setlists FOR DELETE
USING (auth.uid() = artist_id);

CREATE TRIGGER trg_msl_updated_at
BEFORE UPDATE ON public.music_setlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_setlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL REFERENCES public.music_setlists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  track_title TEXT NOT NULL,
  track_id UUID,
  duration_seconds INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msli_setlist ON public.music_setlist_items(setlist_id);

ALTER TABLE public.music_setlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view items on published setlists"
ON public.music_setlist_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.music_setlists s
  WHERE s.id = music_setlist_items.setlist_id AND (s.is_published = true OR s.artist_id = auth.uid())
));

CREATE POLICY "Artists manage items on own setlists insert"
ON public.music_setlist_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.music_setlists s
  WHERE s.id = music_setlist_items.setlist_id AND s.artist_id = auth.uid()
));

CREATE POLICY "Artists manage items on own setlists update"
ON public.music_setlist_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.music_setlists s
  WHERE s.id = music_setlist_items.setlist_id AND s.artist_id = auth.uid()
));

CREATE POLICY "Artists manage items on own setlists delete"
ON public.music_setlist_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.music_setlists s
  WHERE s.id = music_setlist_items.setlist_id AND s.artist_id = auth.uid()
));

CREATE TRIGGER trg_msli_updated_at
BEFORE UPDATE ON public.music_setlist_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_setlist_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL REFERENCES public.music_setlists(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  track_title TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mslr_setlist ON public.music_setlist_requests(setlist_id);
CREATE INDEX idx_mslr_fan ON public.music_setlist_requests(fan_id);

ALTER TABLE public.music_setlist_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view requests"
ON public.music_setlist_requests FOR SELECT
USING (true);

CREATE POLICY "Fans submit own requests"
ON public.music_setlist_requests FOR INSERT
WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Fans edit own requests"
ON public.music_setlist_requests FOR UPDATE
USING (auth.uid() = fan_id);

CREATE POLICY "Artists update requests on own setlists"
ON public.music_setlist_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.music_setlists s
  WHERE s.id = music_setlist_requests.setlist_id AND s.artist_id = auth.uid()
));

CREATE POLICY "Fans delete own requests"
ON public.music_setlist_requests FOR DELETE
USING (auth.uid() = fan_id);

CREATE TRIGGER trg_mslr_updated_at
BEFORE UPDATE ON public.music_setlist_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_setlist_request_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.music_setlist_requests(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, voter_id)
);

CREATE INDEX idx_mslrv_request ON public.music_setlist_request_votes(request_id);

ALTER TABLE public.music_setlist_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view request votes"
ON public.music_setlist_request_votes FOR SELECT
USING (true);

CREATE POLICY "Voters create own request votes"
ON public.music_setlist_request_votes FOR INSERT
WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Voters delete own request votes"
ON public.music_setlist_request_votes FOR DELETE
USING (auth.uid() = voter_id);

CREATE OR REPLACE FUNCTION public.update_setlist_request_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.music_setlist_requests
      SET vote_count = vote_count + 1
      WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.music_setlist_requests
      SET vote_count = GREATEST(0, vote_count - 1)
      WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mslrv_count
AFTER INSERT OR DELETE ON public.music_setlist_request_votes
FOR EACH ROW EXECUTE FUNCTION public.update_setlist_request_votes();