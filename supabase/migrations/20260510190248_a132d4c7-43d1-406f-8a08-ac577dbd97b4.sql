CREATE TABLE public.music_listening_lounges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  album_url TEXT,
  cover_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','live','ended','canceled')),
  attendee_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mll_artist ON public.music_listening_lounges(artist_id);
CREATE INDEX idx_mll_status ON public.music_listening_lounges(status);
CREATE INDEX idx_mll_scheduled ON public.music_listening_lounges(scheduled_at);
ALTER TABLE public.music_listening_lounges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view non-draft lounges" ON public.music_listening_lounges FOR SELECT USING (status <> 'draft' OR auth.uid() = artist_id);
CREATE POLICY "Artists insert own lounges" ON public.music_listening_lounges FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own lounges" ON public.music_listening_lounges FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artists delete own lounges" ON public.music_listening_lounges FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mll_updated_at BEFORE UPDATE ON public.music_listening_lounges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_lounge_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lounge_id UUID NOT NULL REFERENCES public.music_listening_lounges(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lounge_id, fan_id)
);
CREATE INDEX idx_mlr_lounge ON public.music_lounge_rsvps(lounge_id);
CREATE INDEX idx_mlr_fan ON public.music_lounge_rsvps(fan_id);
ALTER TABLE public.music_lounge_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view rsvps" ON public.music_lounge_rsvps FOR SELECT USING (true);
CREATE POLICY "Fans insert own rsvp" ON public.music_lounge_rsvps FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans update own rsvp" ON public.music_lounge_rsvps FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "Fans delete own rsvp" ON public.music_lounge_rsvps FOR DELETE USING (auth.uid() = fan_id);
CREATE TRIGGER trg_mlr_updated_at BEFORE UPDATE ON public.music_lounge_rsvps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_lounge_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lounge_id UUID NOT NULL REFERENCES public.music_listening_lounges(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  position_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mlrx_lounge ON public.music_lounge_reactions(lounge_id);
ALTER TABLE public.music_lounge_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view reactions" ON public.music_lounge_reactions FOR SELECT USING (true);
CREATE POLICY "Fans insert own reactions" ON public.music_lounge_reactions FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans delete own reactions" ON public.music_lounge_reactions FOR DELETE USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_lounge_attendee_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('going','maybe') THEN
      UPDATE public.music_listening_lounges SET attendee_count = attendee_count + 1 WHERE id = NEW.lounge_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('going','maybe') THEN
      UPDATE public.music_listening_lounges SET attendee_count = GREATEST(attendee_count - 1, 0) WHERE id = OLD.lounge_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('going','maybe') AND NEW.status NOT IN ('going','maybe') THEN
      UPDATE public.music_listening_lounges SET attendee_count = GREATEST(attendee_count - 1, 0) WHERE id = NEW.lounge_id;
    ELSIF OLD.status NOT IN ('going','maybe') AND NEW.status IN ('going','maybe') THEN
      UPDATE public.music_listening_lounges SET attendee_count = attendee_count + 1 WHERE id = NEW.lounge_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_lounge_attendees AFTER INSERT OR UPDATE OR DELETE ON public.music_lounge_rsvps FOR EACH ROW EXECUTE FUNCTION public.sync_lounge_attendee_count();