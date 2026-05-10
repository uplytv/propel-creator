
CREATE TABLE public.music_sample_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  bpm INTEGER,
  music_key TEXT,
  genre TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.music_sample_packs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  preview_url TEXT,
  duration_seconds NUMERIC,
  sample_type TEXT NOT NULL DEFAULT 'loop',
  bpm INTEGER,
  music_key TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_sample_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.music_sample_packs(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pack_id, buyer_id)
);

ALTER TABLE public.music_sample_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_sample_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published packs viewable by all"
  ON public.music_sample_packs FOR SELECT
  USING (is_published = true OR auth.uid() = creator_id);

CREATE POLICY "Creators manage own packs"
  ON public.music_sample_packs FOR ALL
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Samples viewable if pack viewable"
  ON public.music_samples FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.music_sample_packs p WHERE p.id = music_samples.pack_id AND (p.is_published = true OR p.creator_id = auth.uid())));

CREATE POLICY "Creators manage own samples"
  ON public.music_samples FOR ALL
  USING (EXISTS (SELECT 1 FROM public.music_sample_packs p WHERE p.id = music_samples.pack_id AND p.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.music_sample_packs p WHERE p.id = music_samples.pack_id AND p.creator_id = auth.uid()));

CREATE POLICY "Buyers view own purchases"
  ON public.music_sample_purchases FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Creators view their pack purchases"
  ON public.music_sample_purchases FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.music_sample_packs p WHERE p.id = music_sample_purchases.pack_id AND p.creator_id = auth.uid()));

CREATE POLICY "Buyers create own purchases"
  ON public.music_sample_purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE INDEX idx_sample_packs_creator ON public.music_sample_packs(creator_id);
CREATE INDEX idx_sample_packs_published ON public.music_sample_packs(is_published, created_at DESC);
CREATE INDEX idx_samples_pack ON public.music_samples(pack_id, position);
CREATE INDEX idx_sample_purchases_buyer ON public.music_sample_purchases(buyer_id);

CREATE TRIGGER update_sample_packs_updated_at
  BEFORE UPDATE ON public.music_sample_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
