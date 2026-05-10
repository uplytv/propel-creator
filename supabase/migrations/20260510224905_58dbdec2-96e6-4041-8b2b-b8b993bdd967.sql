
CREATE TABLE IF NOT EXISTS public.music_sync_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  artist_id UUID,
  title TEXT NOT NULL,
  cover_url TEXT,
  spotify_url TEXT,
  album_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 5 AND 600),
  capacity INTEGER NOT NULL DEFAULT 50 CHECK (capacity BETWEEN 2 AND 5000),
  host_message TEXT,
  going_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mss_host ON public.music_sync_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_mss_artist ON public.music_sync_sessions(artist_id);
CREATE INDEX IF NOT EXISTS idx_mss_when ON public.music_sync_sessions(scheduled_at);

ALTER TABLE public.music_sync_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views sync sessions"
  ON public.music_sync_sessions FOR SELECT USING (true);
CREATE POLICY "Hosts create sync sessions"
  ON public.music_sync_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts update own sync sessions"
  ON public.music_sync_sessions FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts delete own sync sessions"
  ON public.music_sync_sessions FOR DELETE USING (auth.uid() = host_id);

CREATE TRIGGER trg_mss_updated_at
  BEFORE UPDATE ON public.music_sync_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.music_sync_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.music_sync_sessions(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  rsvp TEXT NOT NULL DEFAULT 'going' CHECK (rsvp IN ('going','maybe','cant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_session ON public.music_sync_attendees(session_id);
CREATE INDEX IF NOT EXISTS idx_msa_fan ON public.music_sync_attendees(fan_id);

ALTER TABLE public.music_sync_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views sync attendees"
  ON public.music_sync_attendees FOR SELECT USING (true);
CREATE POLICY "Fans rsvp to sync"
  ON public.music_sync_attendees FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans update own sync rsvp"
  ON public.music_sync_attendees FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "Fans delete own sync rsvp"
  ON public.music_sync_attendees FOR DELETE USING (auth.uid() = fan_id);

CREATE TRIGGER trg_msa_updated_at
  BEFORE UPDATE ON public.music_sync_attendees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_session_going_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _session UUID;
  _going INTEGER;
BEGIN
  _session := COALESCE(NEW.session_id, OLD.session_id);
  SELECT COUNT(*) INTO _going FROM public.music_sync_attendees
    WHERE session_id = _session AND rsvp = 'going';
  UPDATE public.music_sync_sessions SET going_count = _going WHERE id = _session;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_msa_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.music_sync_attendees
  FOR EACH ROW EXECUTE FUNCTION public.sync_session_going_count();
