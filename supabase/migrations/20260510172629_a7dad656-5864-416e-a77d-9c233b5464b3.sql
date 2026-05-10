
CREATE TABLE public.music_artist_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  question TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closes_at TIMESTAMPTZ,
  total_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_artist_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "map_public_view" ON public.music_artist_polls FOR SELECT USING (true);
CREATE POLICY "map_artist_insert" ON public.music_artist_polls FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "map_artist_update" ON public.music_artist_polls FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "map_artist_delete" ON public.music_artist_polls FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_map_updated_at BEFORE UPDATE ON public.music_artist_polls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_map_artist ON public.music_artist_polls(artist_id);

CREATE TABLE public.music_artist_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.music_artist_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_artist_poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mapo_public_view" ON public.music_artist_poll_options FOR SELECT USING (true);
CREATE POLICY "mapo_artist_insert" ON public.music_artist_poll_options FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.music_artist_polls p WHERE p.id = poll_id AND p.artist_id = auth.uid())
);
CREATE POLICY "mapo_artist_update" ON public.music_artist_poll_options FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.music_artist_polls p WHERE p.id = poll_id AND p.artist_id = auth.uid())
);
CREATE POLICY "mapo_artist_delete" ON public.music_artist_poll_options FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.music_artist_polls p WHERE p.id = poll_id AND p.artist_id = auth.uid())
);
CREATE INDEX idx_mapo_poll ON public.music_artist_poll_options(poll_id);

CREATE TABLE public.music_artist_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.music_artist_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.music_artist_poll_options(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, voter_id)
);
ALTER TABLE public.music_artist_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mapv_voter_view" ON public.music_artist_poll_votes FOR SELECT USING (auth.uid() = voter_id);
CREATE POLICY "mapv_artist_view" ON public.music_artist_poll_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.music_artist_polls p WHERE p.id = poll_id AND p.artist_id = auth.uid())
);
CREATE POLICY "mapv_voter_insert" ON public.music_artist_poll_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "mapv_voter_delete" ON public.music_artist_poll_votes FOR DELETE USING (auth.uid() = voter_id);
CREATE INDEX idx_mapv_poll ON public.music_artist_poll_votes(poll_id);
CREATE INDEX idx_mapv_voter ON public.music_artist_poll_votes(voter_id);

CREATE OR REPLACE FUNCTION public.sync_artist_poll_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid UUID;
BEGIN
  pid := COALESCE(NEW.poll_id, OLD.poll_id);
  UPDATE public.music_artist_poll_options o
  SET vote_count = (SELECT COUNT(*) FROM public.music_artist_poll_votes v WHERE v.option_id = o.id)
  WHERE o.poll_id = pid;
  UPDATE public.music_artist_polls
  SET total_votes = (SELECT COUNT(*) FROM public.music_artist_poll_votes v WHERE v.poll_id = pid)
  WHERE id = pid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mapv_sync
  AFTER INSERT OR DELETE ON public.music_artist_poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_artist_poll_counts();
