
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  id, user_id, username, display_name, avatar_url, bio, cover_image_url,
  website, business_category, creator_type, creator_stage, user_type,
  tier, tier_name, created_at, updated_at, travel_city, location_label,
  creator_layout, members,
  account_type, business_status
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile_by_username(text);

CREATE OR REPLACE FUNCTION public.get_public_profile_by_username(_username text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  cover_image_url text,
  bio text,
  travel_city text,
  location_label text,
  creator_type text,
  creator_layout text,
  members integer,
  account_type text,
  business_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.username, p.display_name, p.avatar_url,
    p.cover_image_url, p.bio, p.travel_city, p.location_label,
    p.creator_type, p.creator_layout, p.members,
    p.account_type, p.business_status
  FROM public.profiles p
  WHERE lower(p.username) = lower(regexp_replace(coalesce(_username, ''), '^@+', ''))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO anon, authenticated;
