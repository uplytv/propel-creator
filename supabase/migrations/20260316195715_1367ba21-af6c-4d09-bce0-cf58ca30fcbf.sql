
-- Fix profiles_public view: set security_invoker = false so it bypasses RLS
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = false)
AS
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

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO anon, authenticated;
