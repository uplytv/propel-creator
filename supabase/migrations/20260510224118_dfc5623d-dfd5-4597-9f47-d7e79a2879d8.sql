
CREATE TABLE IF NOT EXISTS public.music_concert_carpools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  concert_label TEXT NOT NULL,
  concert_date DATE,
  origin_city TEXT NOT NULL,
  meeting_point TEXT,
  departure_time TIMESTAMPTZ,
  total_seats INTEGER NOT NULL DEFAULT 4 CHECK (total_seats BETWEEN 1 AND 8),
  seats_taken INTEGER NOT NULL DEFAULT 0,
  contact_note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','closed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcc_concert ON public.music_concert_carpools(concert_label);
CREATE INDEX IF NOT EXISTS idx_mcc_driver ON public.music_concert_carpools(driver_id);
CREATE INDEX IF NOT EXISTS idx_mcc_status ON public.music_concert_carpools(status);

ALTER TABLE public.music_concert_carpools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views carpools"
  ON public.music_concert_carpools FOR SELECT USING (true);
CREATE POLICY "Drivers create carpools"
  ON public.music_concert_carpools FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers update own carpools"
  ON public.music_concert_carpools FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY "Drivers delete own carpools"
  ON public.music_concert_carpools FOR DELETE USING (auth.uid() = driver_id);

CREATE TRIGGER trg_mcc_updated_at
  BEFORE UPDATE ON public.music_concert_carpools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.music_carpool_riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carpool_id UUID NOT NULL REFERENCES public.music_concert_carpools(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','declined','cancelled')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (carpool_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_mcr_carpool ON public.music_carpool_riders(carpool_id);
CREATE INDEX IF NOT EXISTS idx_mcr_rider ON public.music_carpool_riders(rider_id);

ALTER TABLE public.music_carpool_riders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views carpool riders"
  ON public.music_carpool_riders FOR SELECT USING (true);
CREATE POLICY "Riders join carpools"
  ON public.music_carpool_riders FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Rider updates own row"
  ON public.music_carpool_riders FOR UPDATE USING (auth.uid() = rider_id);
CREATE POLICY "Driver moderates riders"
  ON public.music_carpool_riders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.music_concert_carpools c WHERE c.id = carpool_id AND c.driver_id = auth.uid()));
CREATE POLICY "Riders cancel own row"
  ON public.music_carpool_riders FOR DELETE USING (auth.uid() = rider_id);

CREATE TRIGGER trg_mcr_updated_at
  BEFORE UPDATE ON public.music_carpool_riders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_carpool_seats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _carpool UUID;
  _confirmed INTEGER;
  _total INTEGER;
BEGIN
  _carpool := COALESCE(NEW.carpool_id, OLD.carpool_id);
  SELECT COUNT(*) INTO _confirmed FROM public.music_carpool_riders
    WHERE carpool_id = _carpool AND status = 'confirmed';
  SELECT total_seats INTO _total FROM public.music_concert_carpools WHERE id = _carpool;
  UPDATE public.music_concert_carpools
    SET seats_taken = _confirmed,
        status = CASE
          WHEN status IN ('closed','cancelled') THEN status
          WHEN _confirmed >= _total THEN 'full'
          ELSE 'open'
        END
    WHERE id = _carpool;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_mcr_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.music_carpool_riders
  FOR EACH ROW EXECUTE FUNCTION public.sync_carpool_seats();
