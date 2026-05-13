create or replace view public.profiles_public
with (security_invoker = true)
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

create or replace function public.get_public_profile_by_username(_username text)
returns table (
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
  members integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.cover_image_url,
    p.bio,
    p.travel_city,
    p.location_label,
    p.creator_type,
    p.creator_layout,
    p.members
  from public.profiles p
  where lower(p.username) = lower(regexp_replace(coalesce(_username, ''), '^@+', ''))
  limit 1
$$;

create or replace function public.get_public_profile_by_user_id(_user_id uuid)
returns table (
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
  members integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.cover_image_url,
    p.bio,
    p.travel_city,
    p.location_label,
    p.creator_type,
    p.creator_layout,
    p.members
  from public.profiles p
  where p.user_id = _user_id
  limit 1
$$;

grant execute on function public.get_public_profile_by_username(text) to anon, authenticated;
grant execute on function public.get_public_profile_by_user_id(uuid) to anon, authenticated;

comment on function public.get_public_profile_by_username(text) is 'Returns only safe public profile fields for creator pages by handle.';
comment on function public.get_public_profile_by_user_id(uuid) is 'Returns only safe public profile fields for creator pages by user id.';