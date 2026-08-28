-- Allow lead capture on preview (draft/claimed) tenant pages, not just live ones.
DROP POLICY IF EXISTS business_leads_public_insert_preview ON public.business_leads;
CREATE POLICY business_leads_public_insert_preview
  ON public.business_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_details bd
      WHERE bd.id = business_leads.business_id
        AND public.is_previewable_tenant_profile(bd.profile_id)
    )
  );
GRANT INSERT ON public.business_leads TO anon, authenticated;