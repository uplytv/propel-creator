-- Recreate profiles_public as security DEFINER (bypasses RLS, only exposes safe columns)
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  cover_image_url,
  website,
  business_category,
  creator_type,
  creator_stage,
  user_type,
  tier,
  tier_name,
  created_at,
  updated_at
FROM public.profiles;

-- Allow admins to query full profiles table directly
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));