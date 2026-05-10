
CREATE TABLE IF NOT EXISTS public.dj_song_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  dj_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  message TEXT,
  tip_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (tip_amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','playing','played','declined')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_djr_session ON public.dj_song_requests(session_id, status, tip_amount_cents DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_djr_dj ON public.dj_song_requests(dj_id);
CREATE INDEX IF NOT EXISTS idx_djr_fan ON public.dj_song_requests(fan_id);

ALTER TABLE public.dj_song_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requests viewable by authenticated"
  ON public.dj_song_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Fans create own requests"
  ON public.dj_song_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Fan cancels own request"
  ON public.dj_song_requests FOR DELETE TO authenticated
  USING (auth.uid() = fan_id AND status = 'pending');

CREATE POLICY "DJ updates session requests"
  ON public.dj_song_requests FOR UPDATE TO authenticated
  USING (auth.uid() = dj_id) WITH CHECK (auth.uid() = dj_id);

CREATE TRIGGER trg_djr_updated_at
  BEFORE UPDATE ON public.dj_song_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_song_requests;
ALTER TABLE public.dj_song_requests REPLICA IDENTITY FULL;
