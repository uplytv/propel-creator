
CREATE TABLE public.music_merch_waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  drop_title TEXT NOT NULL,
  product_name TEXT NOT NULL,
  image_url TEXT,
  launch_at TIMESTAMPTZ,
  max_signups INTEGER,
  signup_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','launched','canceled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_merch_waitlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merch_waitlists_public_view" ON public.music_merch_waitlists
  FOR SELECT USING (status IN ('open','launched'));
CREATE POLICY "merch_waitlists_artist_view" ON public.music_merch_waitlists
  FOR SELECT USING (auth.uid() = artist_id);
CREATE POLICY "merch_waitlists_artist_insert" ON public.music_merch_waitlists
  FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "merch_waitlists_artist_update" ON public.music_merch_waitlists
  FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "merch_waitlists_artist_delete" ON public.music_merch_waitlists
  FOR DELETE USING (auth.uid() = artist_id);

CREATE TRIGGER trg_mwl_updated_at
  BEFORE UPDATE ON public.music_merch_waitlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mwl_artist ON public.music_merch_waitlists(artist_id);
CREATE INDEX idx_mwl_launch ON public.music_merch_waitlists(launch_at);

CREATE TABLE public.music_merch_waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID NOT NULL REFERENCES public.music_merch_waitlists(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  email TEXT,
  size_pref TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(waitlist_id, fan_id)
);

ALTER TABLE public.music_merch_waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mwls_fan_view_own" ON public.music_merch_waitlist_signups
  FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "mwls_artist_view" ON public.music_merch_waitlist_signups
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.music_merch_waitlists w
    WHERE w.id = waitlist_id AND w.artist_id = auth.uid()
  ));
CREATE POLICY "mwls_fan_insert" ON public.music_merch_waitlist_signups
  FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "mwls_fan_delete" ON public.music_merch_waitlist_signups
  FOR DELETE USING (auth.uid() = fan_id);

CREATE INDEX idx_mwls_waitlist ON public.music_merch_waitlist_signups(waitlist_id);
CREATE INDEX idx_mwls_fan ON public.music_merch_waitlist_signups(fan_id);

CREATE OR REPLACE FUNCTION public.sync_merch_waitlist_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wl UUID;
BEGIN
  wl := COALESCE(NEW.waitlist_id, OLD.waitlist_id);
  UPDATE public.music_merch_waitlists
  SET signup_count = (SELECT COUNT(*) FROM public.music_merch_waitlist_signups WHERE waitlist_id = wl)
  WHERE id = wl;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mwls_sync_count
  AFTER INSERT OR DELETE ON public.music_merch_waitlist_signups
  FOR EACH ROW EXECUTE FUNCTION public.sync_merch_waitlist_count();
