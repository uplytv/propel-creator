-- Slug validation function
create or replace function public.validate_vanity_slug(p_slug text) returns boolean language sql immutable as $$
  select p_slug ~ '^[a-z0-9][a-z0-9_-]{2,29}$' 
    and p_slug not in (
      'admin','api','app','www','mail','help','about','terms','privacy','status','docs','blog','press','jobs',
      'music','feed','search','library','upload','labs','chat','aria','community','content','earn','tools','settings',
      'login','signup','signin','signout','auth','profile','user','users','team','support','contact',
      'artist','artists','track','tracks','album','albums','playlist','playlists','event','events',
      'live','stream','streams','embed','release','releases','presave','distribution','onboard','welcome'
    );
$$;

alter table public.artist_profiles add column if not exists vanity_slug text unique;
alter table public.artist_profiles add column if not exists page_theme jsonb not null default 
  '{"background_color":"#0A0E27","accent_color":"#3D7CFF","accent_color_2":"#B025FF","text_color":"#FFFFFF","hero_style":"logo_centered","show_powered_by":true}'::jsonb;
alter table public.artist_profiles add column if not exists hero_image_url text;
alter table public.artist_profiles add column if not exists hero_logo_url text;
alter table public.artist_profiles add column if not exists tagline text;
alter table public.artist_profiles add column if not exists about_md text;
alter table public.artist_profiles add column if not exists section_order text[] not null 
  default array['hero','social','music','shows','remixes','djsets','about']::text[];
alter table public.artist_profiles add column if not exists section_visibility jsonb not null default 
  '{"hero":true,"social":true,"music":true,"shows":true,"remixes":true,"djsets":true,"about":true,"newsletter":false,"merch":false}'::jsonb;
alter table public.artist_profiles add column if not exists page_published boolean not null default false;
alter table public.artist_profiles add column if not exists seo_title text;
alter table public.artist_profiles add column if not exists seo_description text;
alter table public.artist_profiles add column if not exists seo_og_image text;

alter table public.artist_profiles drop constraint if exists artist_profile_slug_format;
alter table public.artist_profiles add constraint artist_profile_slug_format 
  check (vanity_slug is null or public.validate_vanity_slug(vanity_slug));

alter table public.tracks add column if not exists category text not null default 'song';
alter table public.tracks drop constraint if exists tracks_category_check;
alter table public.tracks add constraint tracks_category_check check (category in ('song','remix','dj_set','live_set','demo','interlude'));

create index if not exists idx_tracks_creator_category on public.tracks(creator_id, category) where is_published = true;
create index if not exists idx_artist_profiles_vanity_slug on public.artist_profiles(vanity_slug) where vanity_slug is not null;