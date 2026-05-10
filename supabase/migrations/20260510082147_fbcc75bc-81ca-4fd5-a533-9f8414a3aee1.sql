
CREATE TABLE public.music_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  artwork_url TEXT,
  audio_url TEXT,
  edition_cap INTEGER NOT NULL DEFAULT 100,
  editions_sold INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft',
  drops_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_drop_editions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID NOT NULL REFERENCES public.music_drops(id) ON DELETE CASCADE,
  collector_id UUID NOT NULL,
  edition_number INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(drop_id, edition_number)
);

ALTER TABLE public.music_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_drop_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active drops viewable by all"
  ON public.music_drops FOR SELECT
  USING (status IN ('active', 'sold_out', 'ended') OR auth.uid() = creator_id);

CREATE POLICY "Creators manage own drops"
  ON public.music_drops FOR ALL
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Editions viewable by collector or drop creator"
  ON public.music_drop_editions FOR SELECT
  USING (auth.uid() = collector_id OR EXISTS (
    SELECT 1 FROM public.music_drops d WHERE d.id = drop_id AND d.creator_id = auth.uid()
  ));

CREATE POLICY "Public viewable count for active drops"
  ON public.music_drop_editions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.music_drops d WHERE d.id = drop_id AND d.status IN ('active','sold_out','ended')));

CREATE INDEX idx_drops_creator ON public.music_drops(creator_id);
CREATE INDEX idx_drops_status ON public.music_drops(status, drops_at DESC);
CREATE INDEX idx_drop_editions_drop ON public.music_drop_editions(drop_id, edition_number);
CREATE INDEX idx_drop_editions_collector ON public.music_drop_editions(collector_id);

CREATE TRIGGER update_music_drops_updated_at
  BEFORE UPDATE ON public.music_drops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.claim_music_drop_edition(_drop_id UUID)
RETURNS public.music_drop_editions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user UUID := auth.uid();
  _drop public.music_drops%ROWTYPE;
  _next_number INTEGER;
  _edition public.music_drop_editions%ROWTYPE;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _drop FROM public.music_drops WHERE id = _drop_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drop not found';
  END IF;

  IF _drop.status <> 'active' THEN
    RAISE EXCEPTION 'Drop is not currently active';
  END IF;

  IF _drop.editions_sold >= _drop.edition_cap THEN
    UPDATE public.music_drops SET status = 'sold_out' WHERE id = _drop_id;
    RAISE EXCEPTION 'Sold out';
  END IF;

  IF EXISTS (SELECT 1 FROM public.music_drop_editions WHERE drop_id = _drop_id AND collector_id = _user) THEN
    RAISE EXCEPTION 'Already claimed an edition';
  END IF;

  _next_number := _drop.editions_sold + 1;

  INSERT INTO public.music_drop_editions (drop_id, collector_id, edition_number, amount_cents, currency)
  VALUES (_drop_id, _user, _next_number, _drop.price_cents, _drop.currency)
  RETURNING * INTO _edition;

  UPDATE public.music_drops
  SET editions_sold = _next_number,
      status = CASE WHEN _next_number >= edition_cap THEN 'sold_out' ELSE status END
  WHERE id = _drop_id;

  RETURN _edition;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.music_drops;
