-- Fan Choice Setlists
CREATE TABLE public.music_fan_setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  show_title TEXT NOT NULL,
  show_date TIMESTAMPTZ,
  venue TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','voting','closed')),
  max_votes_per_fan INT NOT NULL DEFAULT 3 CHECK (max_votes_per_fan > 0),
  vote_count INT NOT NULL DEFAULT 0,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mfs_artist ON public.music_fan_setlists(artist_id);
CREATE INDEX idx_mfs_status ON public.music_fan_setlists(status);
ALTER TABLE public.music_fan_setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view non-draft fan setlists"
  ON public.music_fan_setlists FOR SELECT
  USING (status <> 'draft' OR auth.uid() = artist_id);

CREATE POLICY "Artists manage own fan setlists"
  ON public.music_fan_setlists FOR ALL
  USING (auth.uid() = artist_id)
  WITH CHECK (auth.uid() = artist_id);

CREATE TRIGGER trg_mfs_updated_at
  BEFORE UPDATE ON public.music_fan_setlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Songs
CREATE TABLE public.music_fan_setlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES public.music_fan_setlists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist_label TEXT,
  album TEXT,
  position INT NOT NULL DEFAULT 0,
  vote_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mfss_setlist ON public.music_fan_setlist_songs(setlist_id);
ALTER TABLE public.music_fan_setlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view songs in visible setlists"
  ON public.music_fan_setlist_songs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.music_fan_setlists s
    WHERE s.id = setlist_id AND (s.status <> 'draft' OR s.artist_id = auth.uid())
  ));

CREATE POLICY "Artists manage songs in own setlists"
  ON public.music_fan_setlist_songs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.music_fan_setlists s
    WHERE s.id = setlist_id AND s.artist_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.music_fan_setlists s
    WHERE s.id = setlist_id AND s.artist_id = auth.uid()
  ));

CREATE TRIGGER trg_mfss_updated_at
  BEFORE UPDATE ON public.music_fan_setlist_songs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Votes
CREATE TABLE public.music_fan_setlist_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES public.music_fan_setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.music_fan_setlist_songs(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (song_id, fan_id)
);
CREATE INDEX idx_mfsv_setlist ON public.music_fan_setlist_votes(setlist_id);
CREATE INDEX idx_mfsv_fan ON public.music_fan_setlist_votes(fan_id);
ALTER TABLE public.music_fan_setlist_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view votes for visible setlists"
  ON public.music_fan_setlist_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.music_fan_setlists s
    WHERE s.id = setlist_id AND s.status <> 'draft'
  ));

CREATE POLICY "Fans cast own votes when voting open"
  ON public.music_fan_setlist_votes FOR INSERT
  WITH CHECK (
    auth.uid() = fan_id
    AND EXISTS (
      SELECT 1 FROM public.music_fan_setlists s
      WHERE s.id = setlist_id AND s.status = 'voting'
    )
  );

CREATE POLICY "Fans remove own votes"
  ON public.music_fan_setlist_votes FOR DELETE
  USING (auth.uid() = fan_id);

-- Sync vote counts
CREATE OR REPLACE FUNCTION public.sync_fan_setlist_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_fan_setlist_songs
      SET vote_count = vote_count + 1
      WHERE id = NEW.song_id;
    UPDATE public.music_fan_setlists
      SET vote_count = vote_count + 1
      WHERE id = NEW.setlist_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_fan_setlist_songs
      SET vote_count = GREATEST(vote_count - 1, 0)
      WHERE id = OLD.song_id;
    UPDATE public.music_fan_setlists
      SET vote_count = GREATEST(vote_count - 1, 0)
      WHERE id = OLD.setlist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mfsv_sync
  AFTER INSERT OR DELETE ON public.music_fan_setlist_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_fan_setlist_vote_counts();