
-- =========================
-- A. Recommendations tables
-- =========================
create extension if not exists vector;

create table if not exists public.track_co_plays (
  track_a uuid not null references public.tracks(id) on delete cascade,
  track_b uuid not null references public.tracks(id) on delete cascade,
  co_play_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (track_a, track_b),
  check (track_a <> track_b)
);
create index if not exists track_co_plays_a_idx on public.track_co_plays(track_a, co_play_count desc);
alter table public.track_co_plays enable row level security;
drop policy if exists "co_plays_read_all" on public.track_co_plays;
create policy "co_plays_read_all" on public.track_co_plays for select using (true);

create table if not exists public.user_taste_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  top_genres text[] not null default array[]::text[],
  top_artist_ids uuid[] not null default array[]::uuid[],
  avg_bpm numeric,
  bpm_min numeric,
  bpm_max numeric,
  refreshed_at timestamptz not null default now()
);
alter table public.user_taste_profiles enable row level security;
drop policy if exists "utp_read_own" on public.user_taste_profiles;
drop policy if exists "utp_insert_own" on public.user_taste_profiles;
drop policy if exists "utp_update_own" on public.user_taste_profiles;
create policy "utp_read_own" on public.user_taste_profiles for select using (auth.uid() = user_id);
create policy "utp_insert_own" on public.user_taste_profiles for insert with check (auth.uid() = user_id);
create policy "utp_update_own" on public.user_taste_profiles for update using (auth.uid() = user_id);

create table if not exists public.track_embeddings (
  track_id uuid primary key references public.tracks(id) on delete cascade,
  embedding vector(1536),
  model text not null default 'text-embedding-3-small',
  generated_at timestamptz not null default now()
);
create index if not exists track_embeddings_ivfflat_idx
  on public.track_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
alter table public.track_embeddings enable row level security;
drop policy if exists "te_read_all" on public.track_embeddings;
create policy "te_read_all" on public.track_embeddings for select using (true);

create table if not exists public.daily_mixes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot integer not null check (slot between 1 and 6),
  title text not null,
  description text,
  seed_genres text[] not null default array[]::text[],
  track_ids uuid[] not null default array[]::uuid[],
  refreshed_at timestamptz not null default now(),
  unique (user_id, slot)
);
alter table public.daily_mixes enable row level security;
drop policy if exists "dm_read_own" on public.daily_mixes;
drop policy if exists "dm_write_own" on public.daily_mixes;
create policy "dm_read_own" on public.daily_mixes for select using (auth.uid() = user_id);
create policy "dm_write_own" on public.daily_mixes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- A. Recommendation RPCs (SECURITY DEFINER because track_plays is RLS-locked)
-- =========================
create or replace function public.recs_trending(p_limit int default 20)
returns setof public.tracks
language sql stable security definer set search_path = public as $$
  select t.*
  from public.tracks t
  join (
    select track_id, count(*) as plays_7d
    from public.track_plays
    where played_at > now() - interval '7 days'
    group by track_id
  ) p on p.track_id = t.id
  where t.is_published = true and t.audio_status = 'ready'
  order by p.plays_7d desc, t.play_count desc
  limit p_limit;
$$;

create or replace function public.recs_new_releases(p_limit int default 20)
returns setof public.tracks
language sql stable security definer set search_path = public as $$
  select * from public.tracks
  where is_published = true and audio_status = 'ready'
  order by created_at desc
  limit p_limit;
$$;

create or replace function public.recs_for_you(p_user uuid, p_limit int default 20)
returns setof public.tracks
language sql stable security definer set search_path = public as $$
  with profile as (select top_genres from public.user_taste_profiles where user_id = p_user),
  played as (select track_id from public.track_plays where user_id = p_user)
  select t.* from public.tracks t, profile
  where t.is_published = true
    and t.audio_status = 'ready'
    and t.genre = any(profile.top_genres)
    and t.id not in (select track_id from played)
  order by t.play_count desc, t.created_at desc
  limit p_limit;
$$;

create or replace function public.recs_because_you_listened(p_seed uuid, p_limit int default 10)
returns setof public.tracks
language sql stable security definer set search_path = public as $$
  select t.*
  from public.track_co_plays cp
  join public.tracks t on t.id = cp.track_b
  where cp.track_a = p_seed
    and t.is_published = true
    and t.audio_status = 'ready'
  order by cp.co_play_count desc
  limit p_limit;
$$;

create or replace function public.recs_similar_by_embedding(p_track uuid, p_limit int default 10)
returns setof public.tracks
language sql stable security definer set search_path = public as $$
  with seed as (select embedding from public.track_embeddings where track_id = p_track)
  select t.*
  from public.track_embeddings te
  join public.tracks t on t.id = te.track_id, seed
  where te.track_id <> p_track
    and t.is_published = true
    and t.audio_status = 'ready'
  order by te.embedding <=> seed.embedding
  limit p_limit;
$$;

-- =========================
-- B. Search upgrade
-- =========================
alter table public.tracks add column if not exists search_vector tsvector;
create index if not exists tracks_search_idx on public.tracks using gin(search_vector);

create or replace function public.tracks_search_vector_update() returns trigger
language plpgsql set search_path = public as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.genre, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'D');
  return new;
end $$;
drop trigger if exists tracks_search_vector_trigger on public.tracks;
create trigger tracks_search_vector_trigger
  before insert or update on public.tracks
  for each row execute function public.tracks_search_vector_update();
update public.tracks set title = title where search_vector is null;

alter table public.albums add column if not exists search_vector tsvector;
create index if not exists albums_search_idx on public.albums using gin(search_vector);
create or replace function public.albums_search_vector_update() returns trigger
language plpgsql set search_path = public as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'C');
  return new;
end $$;
drop trigger if exists albums_search_vector_trigger on public.albums;
create trigger albums_search_vector_trigger
  before insert or update on public.albums
  for each row execute function public.albums_search_vector_update();
update public.albums set title = title where search_vector is null;

create table if not exists public.recent_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  searched_at timestamptz not null default now()
);
create index if not exists recent_searches_user_idx on public.recent_searches(user_id, searched_at desc);
alter table public.recent_searches enable row level security;
drop policy if exists "rs_read_own" on public.recent_searches;
drop policy if exists "rs_write_own" on public.recent_searches;
create policy "rs_read_own" on public.recent_searches for select using (auth.uid() = user_id);
create policy "rs_write_own" on public.recent_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.search_music(p_query text, p_limit int default 20)
returns table(kind text, id uuid, title text, subtitle text, image_url text, rank real)
language sql stable security definer set search_path = public as $$
  with q as (select websearch_to_tsquery('simple', coalesce(p_query, '')) as tsq)
  select 'track'::text as kind, t.id, t.title,
         coalesce(p.username, '') as subtitle,
         t.cover_art_url as image_url,
         (ts_rank_cd(t.search_vector, q.tsq) + (coalesce(t.play_count,0)::real / 10000.0))::real as rank
  from public.tracks t
  cross join q
  left join public.profiles p on p.id = t.creator_id
  where t.search_vector @@ q.tsq and t.is_published = true and t.audio_status = 'ready'
  union all
  select 'album'::text as kind, a.id, a.title,
         coalesce(p.username, '') as subtitle,
         a.cover_art_url as image_url,
         ts_rank_cd(a.search_vector, q.tsq)::real as rank
  from public.albums a
  cross join q
  left join public.profiles p on p.id = a.creator_id
  where a.search_vector @@ q.tsq and a.is_published = true
  order by rank desc
  limit p_limit;
$$;
