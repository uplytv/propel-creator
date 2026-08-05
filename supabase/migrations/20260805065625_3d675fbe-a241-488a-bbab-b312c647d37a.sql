-- Previewable tenant helpers: business OR creator pages seeded in draft/claimed/live
CREATE OR REPLACE FUNCTION public.is_previewable_tenant_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _profile_id
      AND p.account_type = ANY (ARRAY['business','creator'])
      AND p.business_status = ANY (ARRAY['draft','claimed','live'])
  )
$$;

CREATE OR REPLACE FUNCTION public.is_previewable_tenant_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.account_type = ANY (ARRAY['business','creator'])
      AND p.business_status = ANY (ARRAY['draft','claimed','live'])
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_previewable_tenant_profile(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_previewable_tenant_user(uuid) TO anon, authenticated, service_role;

-- business_details drives the tenant links page for creators too
DROP POLICY IF EXISTS business_details_public_preview ON public.business_details;
CREATE POLICY business_details_public_preview
  ON public.business_details FOR SELECT
  TO anon, authenticated
  USING (public.is_previewable_tenant_profile(profile_id));

-- blog posts on previewable creator pages
DROP POLICY IF EXISTS posts_public_read_tenant ON public.posts;
CREATE POLICY posts_public_read_tenant
  ON public.posts FOR SELECT
  TO anon, authenticated
  USING (public.is_previewable_tenant_user(user_id));

-- classroom outline (titles only; videos remain gated by their own access checks)
DROP POLICY IF EXISTS classroom_modules_tenant_preview ON public.classroom_modules;
CREATE POLICY classroom_modules_tenant_preview
  ON public.classroom_modules FOR SELECT
  TO anon, authenticated
  USING (public.is_previewable_tenant_user(creator_id));

DROP POLICY IF EXISTS classroom_lessons_tenant_preview ON public.classroom_lessons;
CREATE POLICY classroom_lessons_tenant_preview
  ON public.classroom_lessons FOR SELECT
  TO anon, authenticated
  USING (public.is_previewable_tenant_user(creator_id));