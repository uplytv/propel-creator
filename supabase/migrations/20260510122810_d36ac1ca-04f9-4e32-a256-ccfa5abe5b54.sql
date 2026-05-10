CREATE TABLE public.music_merch_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  bundle_type TEXT NOT NULL DEFAULT 'release',
  release_id UUID,
  tour_id UUID,
  status TEXT NOT NULL DEFAULT 'live',
  inventory_count INTEGER,
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_merch_bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.music_merch_bundles(id) ON DELETE CASCADE,
  item_kind TEXT NOT NULL,
  item_ref_id UUID,
  label TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_merch_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_merch_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views live bundles" ON public.music_merch_bundles
  FOR SELECT USING (status = 'live' OR auth.uid() = owner_id);

CREATE POLICY "Owners manage bundles" ON public.music_merch_bundles
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Anyone views bundle items of live bundles" ON public.music_merch_bundle_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.music_merch_bundles b
            WHERE b.id = bundle_id AND (b.status = 'live' OR b.owner_id = auth.uid()))
  );

CREATE POLICY "Owners manage bundle items" ON public.music_merch_bundle_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.music_merch_bundles b
            WHERE b.id = bundle_id AND b.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.music_merch_bundles b
            WHERE b.id = bundle_id AND b.owner_id = auth.uid())
  );

CREATE INDEX idx_music_merch_bundles_owner ON public.music_merch_bundles(owner_id);
CREATE INDEX idx_music_merch_bundles_status ON public.music_merch_bundles(status);
CREATE INDEX idx_music_merch_bundle_items_bundle ON public.music_merch_bundle_items(bundle_id);

CREATE TRIGGER update_music_merch_bundles_updated_at
BEFORE UPDATE ON public.music_merch_bundles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();