CREATE TABLE IF NOT EXISTS public.smart_link_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  domain text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  verification_token text NOT NULL DEFAULT substring(md5(random()::text || clock_timestamp()::text), 1, 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT smart_link_domains_domain_unique UNIQUE (domain),
  CONSTRAINT smart_link_domains_creator_domain_unique UNIQUE (creator_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_smart_link_domains_creator
  ON public.smart_link_domains(creator_id);

ALTER TABLE public.smart_link_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators manage their own domains" ON public.smart_link_domains;
CREATE POLICY "Creators manage their own domains"
  ON public.smart_link_domains FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);