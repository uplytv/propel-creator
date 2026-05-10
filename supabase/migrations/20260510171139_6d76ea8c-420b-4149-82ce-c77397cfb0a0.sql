CREATE TABLE public.music_show_guest_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  show_title TEXT NOT NULL,
  venue TEXT,
  show_date TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity >= 0),
  spots_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','canceled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msgl_artist ON public.music_show_guest_lists(artist_id);
CREATE INDEX idx_msgl_date ON public.music_show_guest_lists(show_date);

ALTER TABLE public.music_show_guest_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active guest lists"
ON public.music_show_guest_lists FOR SELECT
USING (status <> 'canceled');

CREATE POLICY "Artists view own guest lists"
ON public.music_show_guest_lists FOR SELECT
USING (auth.uid() = artist_id);

CREATE POLICY "Artists insert own guest lists"
ON public.music_show_guest_lists FOR INSERT
WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists update own guest lists"
ON public.music_show_guest_lists FOR UPDATE
USING (auth.uid() = artist_id);

CREATE POLICY "Artists delete own guest lists"
ON public.music_show_guest_lists FOR DELETE
USING (auth.uid() = artist_id);

CREATE TRIGGER trg_msgl_updated_at
BEFORE UPDATE ON public.music_show_guest_lists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_show_guest_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_list_id UUID NOT NULL REFERENCES public.music_show_guest_lists(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  plus_one_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','checked_in')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guest_list_id, fan_id)
);

CREATE INDEX idx_msgr_list ON public.music_show_guest_requests(guest_list_id);
CREATE INDEX idx_msgr_fan ON public.music_show_guest_requests(fan_id);

ALTER TABLE public.music_show_guest_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fans view own requests"
ON public.music_show_guest_requests FOR SELECT
USING (auth.uid() = fan_id);

CREATE POLICY "Artists view requests on own lists"
ON public.music_show_guest_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.music_show_guest_lists g
  WHERE g.id = music_show_guest_requests.guest_list_id AND g.artist_id = auth.uid()
));

CREATE POLICY "Fans submit own requests"
ON public.music_show_guest_requests FOR INSERT
WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Fans edit own requests"
ON public.music_show_guest_requests FOR UPDATE
USING (auth.uid() = fan_id);

CREATE POLICY "Artists update requests on own lists"
ON public.music_show_guest_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.music_show_guest_lists g
  WHERE g.id = music_show_guest_requests.guest_list_id AND g.artist_id = auth.uid()
));

CREATE POLICY "Fans delete own requests"
ON public.music_show_guest_requests FOR DELETE
USING (auth.uid() = fan_id);

CREATE TRIGGER trg_msgr_updated_at
BEFORE UPDATE ON public.music_show_guest_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_guest_list_spots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta INTEGER := 0;
  list_id UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.status IN ('approved','checked_in') THEN
      delta := 1 + CASE WHEN NEW.plus_one_name IS NOT NULL AND NEW.plus_one_name <> '' THEN 1 ELSE 0 END;
    END IF;
    list_id := NEW.guest_list_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    DECLARE
      was_approved BOOLEAN := OLD.status IN ('approved','checked_in');
      is_approved BOOLEAN := NEW.status IN ('approved','checked_in');
      old_size INTEGER := CASE WHEN was_approved THEN 1 + CASE WHEN OLD.plus_one_name IS NOT NULL AND OLD.plus_one_name <> '' THEN 1 ELSE 0 END ELSE 0 END;
      new_size INTEGER := CASE WHEN is_approved THEN 1 + CASE WHEN NEW.plus_one_name IS NOT NULL AND NEW.plus_one_name <> '' THEN 1 ELSE 0 END ELSE 0 END;
    BEGIN
      delta := new_size - old_size;
    END;
    list_id := NEW.guest_list_id;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.status IN ('approved','checked_in') THEN
      delta := -(1 + CASE WHEN OLD.plus_one_name IS NOT NULL AND OLD.plus_one_name <> '' THEN 1 ELSE 0 END);
    END IF;
    list_id := OLD.guest_list_id;
  END IF;

  IF delta <> 0 THEN
    UPDATE public.music_show_guest_lists
      SET spots_used = GREATEST(0, spots_used + delta)
      WHERE id = list_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_msgr_sync_spots
AFTER INSERT OR UPDATE OR DELETE ON public.music_show_guest_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_guest_list_spots();