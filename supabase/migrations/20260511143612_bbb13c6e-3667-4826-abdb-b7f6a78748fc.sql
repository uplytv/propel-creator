-- dsp_connections
create table if not exists public.dsp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('spotify','apple_music','youtube_music','tidal','soundcloud','deezer')),
  access_token text, refresh_token text, token_expires_at timestamptz,
  external_user_id text, scope text, metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);
alter table public.dsp_connections enable row level security;
do $$ begin
  create policy "dsp_select_own" on public.dsp_connections for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "dsp_insert_own" on public.dsp_connections for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "dsp_update_own" on public.dsp_connections for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "dsp_delete_own" on public.dsp_connections for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- track_comments: extend existing
alter table public.track_comments add column if not exists parent_id uuid references public.track_comments(id) on delete cascade;
alter table public.track_comments add column if not exists like_count integer not null default 0;
alter table public.track_comments add column if not exists updated_at timestamptz not null default now();
create index if not exists track_comments_track_idx on public.track_comments(track_id, created_at desc);
create index if not exists track_comments_ts_idx on public.track_comments(track_id, timestamp_seconds);
alter table public.track_comments enable row level security;
do $$ begin
  create policy "tc_select_all" on public.track_comments for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tc_insert_self" on public.track_comments for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tc_update_self" on public.track_comments for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tc_delete_self_or_creator" on public.track_comments for delete using (
    auth.uid() = user_id OR auth.uid() = (select creator_id from public.tracks where id = track_id)
  );
exception when duplicate_object then null; end $$;

-- track_comment_likes
create table if not exists public.track_comment_likes (
  comment_id uuid not null references public.track_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.track_comment_likes enable row level security;
do $$ begin
  create policy "tcl_select_all" on public.track_comment_likes for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tcl_insert_self" on public.track_comment_likes for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tcl_delete_self" on public.track_comment_likes for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- track_reposts: add unique constraint on (track_id, user_id)
do $$ begin
  alter table public.track_reposts add constraint track_reposts_track_user_unique unique (track_id, user_id);
exception when duplicate_object then null; when duplicate_table then null; end $$;
alter table public.track_reposts enable row level security;
do $$ begin
  create policy "tr_select_all" on public.track_reposts for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tr_insert_self" on public.track_reposts for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tr_delete_self" on public.track_reposts for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- activity_feed_events
create table if not exists public.activity_feed_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('track_uploaded','track_reposted','playlist_created','album_released','track_liked')),
  target_track_id uuid references public.tracks(id) on delete cascade,
  target_album_id uuid references public.albums(id) on delete cascade,
  target_playlist_id uuid references public.music_playlists(id) on delete cascade,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_feed_actor_idx on public.activity_feed_events(actor_id, created_at desc);
alter table public.activity_feed_events enable row level security;
do $$ begin
  create policy "afe_select_all" on public.activity_feed_events for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "afe_insert_self" on public.activity_feed_events for insert with check (auth.uid() = actor_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "afe_delete_self" on public.activity_feed_events for delete using (auth.uid() = actor_id);
exception when duplicate_object then null; end $$;

-- tracks columns
alter table public.tracks add column if not exists allow_download boolean not null default false;
alter table public.tracks add column if not exists download_count integer not null default 0;
alter table public.tracks add column if not exists repost_count integer not null default 0;
alter table public.tracks add column if not exists comment_count integer not null default 0;
alter table public.tracks add column if not exists tags text[] not null default array[]::text[];
alter table public.tracks add column if not exists embed_enabled boolean not null default true;
alter table public.tracks add column if not exists buy_url text;
alter table public.tracks add column if not exists waveform_peaks jsonb;
alter table public.tracks add column if not exists bpm numeric;
alter table public.tracks add column if not exists key_signature text;

-- artist_profiles columns
alter table public.artist_profiles add column if not exists spotlight_track_ids uuid[] not null default array[]::uuid[];
alter table public.artist_profiles add column if not exists related_artists uuid[] not null default array[]::uuid[];
alter table public.artist_profiles add column if not exists pinned_playlist_id uuid references public.music_playlists(id);

-- Counter triggers
create or replace function public.bump_track_repost_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then update public.tracks set repost_count = repost_count + 1 where id = NEW.track_id;
  elsif TG_OP = 'DELETE' then update public.tracks set repost_count = greatest(0, repost_count - 1) where id = OLD.track_id; end if;
  return null;
end $$;
drop trigger if exists track_reposts_count on public.track_reposts;
create trigger track_reposts_count after insert or delete on public.track_reposts for each row execute function public.bump_track_repost_count();

create or replace function public.bump_track_comment_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then update public.tracks set comment_count = comment_count + 1 where id = NEW.track_id;
  elsif TG_OP = 'DELETE' then update public.tracks set comment_count = greatest(0, comment_count - 1) where id = OLD.track_id; end if;
  return null;
end $$;
drop trigger if exists track_comments_count on public.track_comments;
create trigger track_comments_count after insert or delete on public.track_comments for each row execute function public.bump_track_comment_count();