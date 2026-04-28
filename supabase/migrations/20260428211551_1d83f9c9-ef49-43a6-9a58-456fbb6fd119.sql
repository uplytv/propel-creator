ALTER TABLE public.smart_links
  ADD COLUMN IF NOT EXISTS itunes_affiliate_token TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_sound_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain_verification_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS smart_links_custom_domain_unique
  ON public.smart_links (lower(custom_domain))
  WHERE custom_domain IS NOT NULL;

-- Backfill verification tokens for any existing rows that already had a custom_domain set
UPDATE public.smart_links
SET custom_domain_verification_token = encode(gen_random_bytes(16), 'hex')
WHERE custom_domain IS NOT NULL
  AND custom_domain_verification_token IS NULL;