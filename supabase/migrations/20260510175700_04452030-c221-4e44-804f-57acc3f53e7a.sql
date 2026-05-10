
CREATE TABLE public.music_vinyl_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  edition_size INT NOT NULL DEFAULT 0,
  price_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','announced','preorder','shipped','soldout')),
  reserved_count INT NOT NULL DEFAULT 0,
  ships_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mvd_artist ON public.music_vinyl_drops(artist_id);
CREATE INDEX IF NOT EXISTS idx_mvd_status ON public.music_vinyl_drops(status);
ALTER TABLE public.music_vinyl_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vd public view" ON public.music_vinyl_drops FOR SELECT
  USING (status <> 'draft' OR auth.uid() = artist_id);
CREATE POLICY "vd artist insert" ON public.music_vinyl_drops FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "vd artist update" ON public.music_vinyl_drops FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "vd artist delete" ON public.music_vinyl_drops FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mvd_updated_at BEFORE UPDATE ON public.music_vinyl_drops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_vinyl_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID NOT NULL REFERENCES public.music_vinyl_drops(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(drop_id, fan_id)
);
CREATE INDEX IF NOT EXISTS idx_mvr_drop ON public.music_vinyl_reservations(drop_id);
CREATE INDEX IF NOT EXISTS idx_mvr_fan ON public.music_vinyl_reservations(fan_id);
ALTER TABLE public.music_vinyl_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vr fan view own" ON public.music_vinyl_reservations FOR SELECT
  USING (auth.uid() = fan_id OR EXISTS (SELECT 1 FROM public.music_vinyl_drops d WHERE d.id = drop_id AND d.artist_id = auth.uid()));
CREATE POLICY "vr fan insert" ON public.music_vinyl_reservations FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "vr fan update" ON public.music_vinyl_reservations FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "vr fan delete" ON public.music_vinyl_reservations FOR DELETE USING (auth.uid() = fan_id);
CREATE TRIGGER trg_mvr_updated_at BEFORE UPDATE ON public.music_vinyl_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_vinyl_reservation_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  delta INT := 0;
  was_active BOOLEAN;
  is_active BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('pending','confirmed') THEN
      UPDATE public.music_vinyl_drops SET reserved_count = reserved_count + NEW.quantity WHERE id = NEW.drop_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('pending','confirmed') THEN
      UPDATE public.music_vinyl_drops SET reserved_count = GREATEST(reserved_count - OLD.quantity, 0) WHERE id = OLD.drop_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    was_active := OLD.status IN ('pending','confirmed');
    is_active := NEW.status IN ('pending','confirmed');
    IF was_active AND NOT is_active THEN
      delta := -OLD.quantity;
    ELSIF NOT was_active AND is_active THEN
      delta := NEW.quantity;
    ELSIF was_active AND is_active AND OLD.quantity <> NEW.quantity THEN
      delta := NEW.quantity - OLD.quantity;
    END IF;
    IF delta <> 0 THEN
      UPDATE public.music_vinyl_drops SET reserved_count = GREATEST(reserved_count + delta, 0) WHERE id = NEW.drop_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_vinyl_reservations
AFTER INSERT OR UPDATE OR DELETE ON public.music_vinyl_reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_vinyl_reservation_count();
