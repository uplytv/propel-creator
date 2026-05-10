CREATE TABLE public.music_artist_fan_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  listens INTEGER NOT NULL DEFAULT 0,
  tips_cents INTEGER NOT NULL DEFAULT 0,
  dedications_count INTEGER NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, fan_id)
);

CREATE INDEX idx_mafp_artist_points ON public.music_artist_fan_points(artist_id, points DESC);
CREATE INDEX idx_mafp_fan ON public.music_artist_fan_points(fan_id);

ALTER TABLE public.music_artist_fan_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view fan points"
ON public.music_artist_fan_points FOR SELECT
USING (true);

CREATE TRIGGER trg_mafp_updated_at
BEFORE UPDATE ON public.music_artist_fan_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_fan_point_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('listen','tip','dedication','preorder','ppv','ama','setlist','other')),
  points INTEGER NOT NULL DEFAULT 0,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfpe_artist ON public.music_fan_point_events(artist_id, created_at DESC);
CREATE INDEX idx_mfpe_fan ON public.music_fan_point_events(fan_id, created_at DESC);

ALTER TABLE public.music_fan_point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans view own events"
ON public.music_fan_point_events FOR SELECT
USING (auth.uid() = fan_id);

CREATE POLICY "Artists view own events"
ON public.music_fan_point_events FOR SELECT
USING (auth.uid() = artist_id);

CREATE OR REPLACE FUNCTION public.add_fan_points(
  _artist_id UUID,
  _fan_id UUID,
  _source TEXT,
  _points INTEGER,
  _ref_id UUID DEFAULT NULL,
  _tip_cents INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.music_artist_fan_points (
    artist_id, fan_id, points, listens, tips_cents, dedications_count, last_event_at
  )
  VALUES (
    _artist_id, _fan_id, _points,
    CASE WHEN _source = 'listen' THEN 1 ELSE 0 END,
    CASE WHEN _source = 'tip' THEN _tip_cents ELSE 0 END,
    CASE WHEN _source = 'dedication' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (artist_id, fan_id) DO UPDATE
  SET points = music_artist_fan_points.points + EXCLUDED.points,
      listens = music_artist_fan_points.listens + EXCLUDED.listens,
      tips_cents = music_artist_fan_points.tips_cents + EXCLUDED.tips_cents,
      dedications_count = music_artist_fan_points.dedications_count + EXCLUDED.dedications_count,
      last_event_at = now();

  INSERT INTO public.music_fan_point_events (artist_id, fan_id, source, points, ref_id)
  VALUES (_artist_id, _fan_id, _source, _points, _ref_id);
END;
$$;