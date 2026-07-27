-- SECURITY DEFINER helper: is this profile_id a business visible to anon (draft/claimed/live)?
CREATE OR REPLACE FUNCTION public.is_visible_business_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _profile_id
      AND p.account_type = 'business'
      AND p.business_status = ANY (ARRAY['draft','claimed','live'])
  )
$$;

-- Same helper keyed by user_id (for posts)
CREATE OR REPLACE FUNCTION public.is_visible_business_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.account_type = 'business'
      AND p.business_status = ANY (ARRAY['draft','claimed','live'])
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_visible_business_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_visible_business_user(uuid) TO anon, authenticated;

-- Replace the business_details public read policy so its subquery bypasses
-- profiles RLS (anon has no SELECT policy on profiles, which was silently
-- filtering out draft rows).
DROP POLICY IF EXISTS business_details_public_read_any_status ON public.business_details;
CREATE POLICY business_details_public_read_any_status
  ON public.business_details
  FOR SELECT
  TO anon, authenticated
  USING (public.is_visible_business_profile(profile_id));

-- Allow anon to read posts authored by a visible business owner.
DROP POLICY IF EXISTS posts_public_read_business ON public.posts;
CREATE POLICY posts_public_read_business
  ON public.posts
  FOR SELECT
  TO anon, authenticated
  USING (public.is_visible_business_user(user_id));

-- Ensure anon has table-level SELECT grant on posts (required alongside RLS).
GRANT SELECT ON public.posts TO anon;