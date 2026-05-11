create table if not exists public.presave_campaigns (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  release_at timestamptz not null,
  spotify_track_uri text,
  apple_album_id text,
  status text not null default 'draft' check (status in ('draft','active','released','cancelled')),
  distribution_confirmed_spotify boolean not null default false,
  distribution_confirmed_apple boolean not null default false,
  campaign_url_slug text unique,
  cover_art_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists presave_campaigns_track_idx on public.presave_campaigns(track_id);
create index if not exists presave_campaigns_release_idx on public.presave_campaigns(release_at) where status = 'active';

alter table public.presave_campaigns enable row level security;

drop policy if exists "pc_select_public" on public.presave_campaigns;
create policy "pc_select_public" on public.presave_campaigns for select using (status in ('active','released'));

drop policy if exists "pc_select_own" on public.presave_campaigns;
create policy "pc_select_own" on public.presave_campaigns for select using (auth.uid() = creator_id);

drop policy if exists "pc_write_own" on public.presave_campaigns;
create policy "pc_write_own" on public.presave_campaigns for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

create trigger presave_campaigns_updated_at
  before update on public.presave_campaigns
  for each row execute function public.update_updated_at_column();

create table if not exists public.presave_subscribers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.presave_campaigns(id) on delete cascade,
  email text not null,
  platform text not null check (platform in ('spotify','apple_music','email_only')),
  spotify_access_token text,
  spotify_refresh_token text,
  spotify_user_id text,
  apple_music_user_token text,
  consent_save_track boolean not null default false,
  consent_follow_artist boolean not null default false,
  fulfilled boolean not null default false,
  fulfilled_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  unique (campaign_id, email, platform)
);

create index if not exists presave_subscribers_campaign_idx on public.presave_subscribers(campaign_id);

alter table public.presave_subscribers enable row level security;

drop policy if exists "ps_select_own_campaign" on public.presave_subscribers;
create policy "ps_select_own_campaign" on public.presave_subscribers for select
  using (campaign_id in (select id from public.presave_campaigns where creator_id = auth.uid()));

drop policy if exists "ps_insert_anyone" on public.presave_subscribers;
create policy "ps_insert_anyone" on public.presave_subscribers for insert with check (true);