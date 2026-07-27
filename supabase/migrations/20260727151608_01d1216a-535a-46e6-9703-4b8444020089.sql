
-- 1. Extend profiles with account_type + business_status
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'creator'
    CHECK (account_type IN ('creator','business')),
  ADD COLUMN IF NOT EXISTS business_status text
    CHECK (business_status IN ('draft','claimed','live'));

CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_business_status ON public.profiles(business_status);

-- 2. business_details
CREATE TABLE IF NOT EXISTS public.business_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  category text,
  tagline text,
  address text,
  city text,
  phone text,
  email text,
  hours jsonb DEFAULT '{}'::jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  testimonials jsonb DEFAULT '[]'::jsonb,
  google_rating numeric(2,1),
  google_reviews_count integer,
  google_maps_url text,
  hero_image_url text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_details TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_details TO authenticated;
GRANT ALL ON public.business_details TO service_role;

ALTER TABLE public.business_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_details_public_read_live"
  ON public.business_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = business_details.profile_id
        AND p.business_status = 'live'
    )
  );

CREATE POLICY "business_details_owner_read"
  ON public.business_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = business_details.profile_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "business_details_owner_write"
  ON public.business_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = business_details.profile_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = business_details.profile_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_business_details_updated_at ON public.business_details;
CREATE TRIGGER update_business_details_updated_at
  BEFORE UPDATE ON public.business_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. business_leads
CREATE TABLE IF NOT EXISTS public.business_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.business_details(id) ON DELETE CASCADE,
  name text,
  phone text,
  email text,
  message text,
  source text NOT NULL DEFAULT 'profile',
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_leads_business_id ON public.business_leads(business_id);
CREATE INDEX IF NOT EXISTS idx_business_leads_created_at ON public.business_leads(created_at DESC);

GRANT INSERT ON public.business_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_leads TO authenticated;
GRANT ALL ON public.business_leads TO service_role;

ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_leads_public_insert_live"
  ON public.business_leads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.business_details bd
      JOIN public.profiles p ON p.id = bd.profile_id
      WHERE bd.id = business_leads.business_id
        AND p.business_status = 'live'
    )
  );

CREATE POLICY "business_leads_owner_read"
  ON public.business_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_details bd
      JOIN public.profiles p ON p.id = bd.profile_id
      WHERE bd.id = business_leads.business_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "business_leads_owner_update"
  ON public.business_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_details bd
      JOIN public.profiles p ON p.id = bd.profile_id
      WHERE bd.id = business_leads.business_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "business_leads_owner_delete"
  ON public.business_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_details bd
      JOIN public.profiles p ON p.id = bd.profile_id
      WHERE bd.id = business_leads.business_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 4. business_page_events
CREATE TABLE IF NOT EXISTS public.business_page_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.business_details(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','call_tap','maps_tap','lead_submit','blog_view')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bpe_business_created ON public.business_page_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bpe_business_type ON public.business_page_events(business_id, event_type);

GRANT INSERT ON public.business_page_events TO anon;
GRANT SELECT, INSERT ON public.business_page_events TO authenticated;
GRANT ALL ON public.business_page_events TO service_role;

ALTER TABLE public.business_page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bpe_public_insert_live"
  ON public.business_page_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.business_details bd
      JOIN public.profiles p ON p.id = bd.profile_id
      WHERE bd.id = business_page_events.business_id
        AND p.business_status = 'live'
    )
  );

CREATE POLICY "bpe_owner_read"
  ON public.business_page_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_details bd
      JOIN public.profiles p ON p.id = bd.profile_id
      WHERE bd.id = business_page_events.business_id
        AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 5. Weekly summary view (security_invoker so RLS applies as caller)
CREATE OR REPLACE VIEW public.business_weekly_summary
WITH (security_invoker = true)
AS
SELECT
  bd.id AS business_id,
  COALESCE(SUM(CASE WHEN bpe.event_type = 'view' AND bpe.created_at >= now() - interval '7 days' THEN 1 ELSE 0 END), 0)::int AS views_7d,
  COALESCE(SUM(CASE WHEN bpe.event_type = 'call_tap' AND bpe.created_at >= now() - interval '7 days' THEN 1 ELSE 0 END), 0)::int AS call_taps_7d,
  COALESCE(SUM(CASE WHEN bpe.event_type = 'maps_tap' AND bpe.created_at >= now() - interval '7 days' THEN 1 ELSE 0 END), 0)::int AS maps_taps_7d,
  COALESCE(SUM(CASE WHEN bpe.event_type = 'blog_view' AND bpe.created_at >= now() - interval '7 days' THEN 1 ELSE 0 END), 0)::int AS blog_views_7d,
  (
    SELECT COUNT(*)::int FROM public.business_leads bl
    WHERE bl.business_id = bd.id AND bl.created_at >= now() - interval '7 days'
  ) AS leads_7d,
  (
    SELECT (bpe2.metadata->>'post_id')
    FROM public.business_page_events bpe2
    WHERE bpe2.business_id = bd.id
      AND bpe2.event_type = 'blog_view'
      AND bpe2.created_at >= now() - interval '7 days'
      AND bpe2.metadata ? 'post_id'
    GROUP BY bpe2.metadata->>'post_id'
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) AS top_blog_post_id
FROM public.business_details bd
LEFT JOIN public.business_page_events bpe ON bpe.business_id = bd.id
GROUP BY bd.id;

GRANT SELECT ON public.business_weekly_summary TO authenticated;
GRANT SELECT ON public.business_weekly_summary TO service_role;
