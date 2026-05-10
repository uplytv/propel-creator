
CREATE TABLE public.music_nft_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  track_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  artwork_url TEXT,
  edition_size INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  chain TEXT NOT NULL DEFAULT 'base',
  contract_address TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  drop_starts_at TIMESTAMPTZ,
  drop_ends_at TIMESTAMPTZ,
  minted_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_music_nft_drops_owner ON public.music_nft_drops(owner_id);
CREATE INDEX idx_music_nft_drops_status ON public.music_nft_drops(status);

ALTER TABLE public.music_nft_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live drops"
ON public.music_nft_drops FOR SELECT
USING (status IN ('live','sold_out','ended'));

CREATE POLICY "Owners view own drops"
ON public.music_nft_drops FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Owners insert drops"
ON public.music_nft_drops FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update drops"
ON public.music_nft_drops FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Owners delete drops"
ON public.music_nft_drops FOR DELETE
USING (auth.uid() = owner_id);

CREATE TRIGGER update_music_nft_drops_updated_at
BEFORE UPDATE ON public.music_nft_drops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_nft_editions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID NOT NULL REFERENCES public.music_nft_drops(id) ON DELETE CASCADE,
  edition_number INTEGER NOT NULL,
  owner_user_id UUID,
  wallet_address TEXT,
  tx_hash TEXT,
  minted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(drop_id, edition_number)
);

CREATE INDEX idx_music_nft_editions_drop ON public.music_nft_editions(drop_id);
CREATE INDEX idx_music_nft_editions_owner ON public.music_nft_editions(owner_user_id);

ALTER TABLE public.music_nft_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view editions of live drops"
ON public.music_nft_editions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.music_nft_drops d WHERE d.id = drop_id AND d.status IN ('live','sold_out','ended')));

CREATE POLICY "Collectors view own editions"
ON public.music_nft_editions FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "Drop owners view all their editions"
ON public.music_nft_editions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.music_nft_drops d WHERE d.id = drop_id AND d.owner_id = auth.uid()));

CREATE POLICY "Authenticated users can mint editions"
ON public.music_nft_editions FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);
