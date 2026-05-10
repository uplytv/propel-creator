
CREATE TABLE IF NOT EXISTS public.music_merch_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  price_cents integer NOT NULL DEFAULT 0,
  stock_total integer NOT NULL DEFAULT 0,
  stock_remaining integer NOT NULL DEFAULT 0,
  launch_at timestamptz NOT NULL,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','live','sold_out','ended','cancelled')),
  reservation_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mmd_artist ON public.music_merch_drops(artist_id);
CREATE INDEX IF NOT EXISTS idx_mmd_status ON public.music_merch_drops(status);
CREATE INDEX IF NOT EXISTS idx_mmd_launch ON public.music_merch_drops(launch_at);

ALTER TABLE public.music_merch_drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view non-draft drops" ON public.music_merch_drops;
CREATE POLICY "Public view non-draft drops" ON public.music_merch_drops
  FOR SELECT USING (status <> 'draft');

DROP POLICY IF EXISTS "Artists manage own drops" ON public.music_merch_drops;
CREATE POLICY "Artists manage own drops" ON public.music_merch_drops
  FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

CREATE TABLE IF NOT EXISTS public.music_merch_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES public.music_merch_drops(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(drop_id, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_mmr_drop ON public.music_merch_reservations(drop_id);
CREATE INDEX IF NOT EXISTS idx_mmr_fan ON public.music_merch_reservations(fan_id);

ALTER TABLE public.music_merch_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fans manage own reservations" ON public.music_merch_reservations;
CREATE POLICY "Fans manage own reservations" ON public.music_merch_reservations
  FOR ALL USING (auth.uid() = fan_id) WITH CHECK (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Artists view their drop reservations" ON public.music_merch_reservations;
CREATE POLICY "Artists view their drop reservations" ON public.music_merch_reservations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.music_merch_drops d WHERE d.id = drop_id AND d.artist_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.sync_merch_reservation_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_merch_drops
      SET reservation_count = reservation_count + NEW.quantity,
          stock_remaining = GREATEST(0, stock_remaining - NEW.quantity),
          updated_at = now()
      WHERE id = NEW.drop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_merch_drops
      SET reservation_count = GREATEST(0, reservation_count - OLD.quantity),
          stock_remaining = stock_remaining + OLD.quantity,
          updated_at = now()
      WHERE id = OLD.drop_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mmr_sync ON public.music_merch_reservations;
CREATE TRIGGER trg_mmr_sync
AFTER INSERT OR DELETE ON public.music_merch_reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_merch_reservation_counts();

CREATE OR REPLACE FUNCTION public.update_mmd_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_mmd_updated_at ON public.music_merch_drops;
CREATE TRIGGER trg_mmd_updated_at
BEFORE UPDATE ON public.music_merch_drops
FOR EACH ROW EXECUTE FUNCTION public.update_mmd_updated_at();
