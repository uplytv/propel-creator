
CREATE TABLE public.music_listening_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_listen_date DATE,
  total_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fan_id, artist_id)
);
ALTER TABLE public.music_listening_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mls_fan_view" ON public.music_listening_streaks FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "mls_artist_view" ON public.music_listening_streaks FOR SELECT USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mls_updated_at BEFORE UPDATE ON public.music_listening_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_mls_artist ON public.music_listening_streaks(artist_id, current_streak DESC);
CREATE INDEX idx_mls_fan ON public.music_listening_streaks(fan_id);

CREATE TABLE public.music_listening_streak_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  listen_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fan_id, artist_id, listen_date)
);
ALTER TABLE public.music_listening_streak_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mlsd_fan_view" ON public.music_listening_streak_days FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "mlsd_artist_view" ON public.music_listening_streak_days FOR SELECT USING (auth.uid() = artist_id);
CREATE INDEX idx_mlsd_fan_artist ON public.music_listening_streak_days(fan_id, artist_id, listen_date DESC);

CREATE OR REPLACE FUNCTION public.record_listening_day(_artist_id UUID)
RETURNS public.music_listening_streaks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fan UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _row public.music_listening_streaks;
  _new_current INTEGER;
BEGIN
  IF _fan IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.music_listening_streak_days(fan_id, artist_id, listen_date)
  VALUES (_fan, _artist_id, _today)
  ON CONFLICT (fan_id, artist_id, listen_date) DO NOTHING;

  SELECT * INTO _row FROM public.music_listening_streaks
  WHERE fan_id = _fan AND artist_id = _artist_id;

  IF NOT FOUND THEN
    INSERT INTO public.music_listening_streaks(fan_id, artist_id, current_streak, longest_streak, last_listen_date, total_days)
    VALUES (_fan, _artist_id, 1, 1, _today, 1)
    RETURNING * INTO _row;
    RETURN _row;
  END IF;

  IF _row.last_listen_date = _today THEN
    RETURN _row;
  ELSIF _row.last_listen_date = _today - INTERVAL '1 day' THEN
    _new_current := _row.current_streak + 1;
  ELSE
    _new_current := 1;
  END IF;

  UPDATE public.music_listening_streaks
  SET current_streak = _new_current,
      longest_streak = GREATEST(longest_streak, _new_current),
      last_listen_date = _today,
      total_days = total_days + 1
  WHERE id = _row.id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_listening_day(UUID) TO authenticated;
