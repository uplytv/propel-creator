create or replace view public.profiles_public
with (security_invoker = false)
as
select
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
  updated_at,
  travel_city,
  location_label,
  creator_layout,
  members
from public.profiles;

grant select on public.profiles_public to anon, authenticated;

comment on view public.profiles_public is 'Safe public profile fields used by creator profile pages.';