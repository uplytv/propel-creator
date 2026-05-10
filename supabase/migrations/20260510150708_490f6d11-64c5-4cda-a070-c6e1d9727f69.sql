CREATE TABLE IF NOT EXISTS public.artist_merch_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merch_id UUID NOT NULL REFERENCES public.artist_merch(id) ON DELETE CASCADE,
  size TEXT,
  color TEXT,
  sku TEXT,
  price_cents_override INTEGER,
  stock_count INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_merch_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_amv_merch ON public.artist_merch_variants(merch_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_amv_sku ON public.artist_merch_variants(sku) WHERE sku IS NOT NULL;

DO $$ BEGIN
  CREATE POLICY "amv_public_select" ON public.artist_merch_variants FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "amv_artist_insert" ON public.artist_merch_variants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.artist_merch m
    JOIN public.artist_profiles ap ON ap.id = m.artist_id
    WHERE m.id = merch_id AND ap.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "amv_artist_update" ON public.artist_merch_variants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.artist_merch m
    JOIN public.artist_profiles ap ON ap.id = m.artist_id
    WHERE m.id = merch_id AND ap.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "amv_artist_delete" ON public.artist_merch_variants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.artist_merch m
    JOIN public.artist_profiles ap ON ap.id = m.artist_id
    WHERE m.id = merch_id AND ap.user_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_amv_updated_at BEFORE UPDATE ON public.artist_merch_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.decrement_merch_variant_stock(_variant_id UUID, _qty INTEGER DEFAULT 1)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining INTEGER;
BEGIN
  UPDATE public.artist_merch_variants
  SET stock_count = stock_count - _qty
  WHERE id = _variant_id AND stock_count >= _qty
  RETURNING stock_count INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;
  RETURN remaining;
END;
$$;