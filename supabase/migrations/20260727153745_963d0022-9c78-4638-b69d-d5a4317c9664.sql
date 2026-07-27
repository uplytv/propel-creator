-- Widen public read of business_details to include draft and claimed statuses
-- so anyone with the direct link can preview. Discovery/sitemap layers still
-- gate visibility by business_status = 'live' outside RLS.

DROP POLICY IF EXISTS "business_details_public_read_live" ON public.business_details;

CREATE POLICY "business_details_public_read_any_status"
  ON public.business_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = business_details.profile_id
        AND p.business_status IN ('draft','claimed','live')
    )
  );
