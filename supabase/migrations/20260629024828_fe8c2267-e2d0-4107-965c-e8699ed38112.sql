CREATE OR REPLACE FUNCTION public.get_public_creator_og_profile(_username text)
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  bio text,
  channel_tagline text,
  avatar_url text,
  cover_image_url text,
  profile_og_image_url text,
  vanity_slug text,
  artist_bio text,
  tagline text,
  header_image_url text,
  hero_image_url text,
  artist_og_image_url text,
  seo_og_image text,
  seo_description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  with handle as (
    select lower(regexp_replace(coalesce(_username, ''), '^@+', '')) as value
  ), matched_profile as (
    select p.*
    from public.profiles p, handle h
    where lower(p.username) = h.value
    limit 1
  ), matched_artist as (
    select ap.*
    from public.artist_profiles ap, handle h
    where lower(ap.vanity_slug) = h.value
       or ap.user_id = (select user_id from matched_profile limit 1)
    order by case when lower(ap.vanity_slug) = h.value then 0 else 1 end
    limit 1
  ), resolved_user as (
    select coalesce(
      (select user_id from matched_profile limit 1),
      (select user_id from matched_artist limit 1)
    ) as id
  ), final_profile as (
    select p.*
    from public.profiles p
    where p.user_id = (select id from resolved_user)
    limit 1
  )
  select
    coalesce(fp.user_id, ma.user_id) as user_id,
    fp.username,
    fp.display_name,
    fp.bio,
    fp.channel_tagline,
    fp.avatar_url,
    fp.cover_image_url,
    fp.og_image_url as profile_og_image_url,
    ma.vanity_slug,
    ma.artist_bio,
    ma.tagline,
    ma.header_image_url,
    ma.hero_image_url,
    ma.og_image_url as artist_og_image_url,
    ma.seo_og_image,
    ma.seo_description
  from resolved_user ru
  left join final_profile fp on true
  left join matched_artist ma on true
  where ru.id is not null
  limit 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_creator_og_profile(text) TO anon, authenticated, service_role;