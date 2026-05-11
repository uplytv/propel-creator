-- Release Tracker: granular status enum + new fields + sync trigger
alter table public.music_distribution_targets 
  drop constraint if exists music_distribution_targets_status_check;

alter table public.music_distribution_targets 
  alter column status set default 'not_submitted';

alter table public.music_distribution_targets 
  add constraint music_distribution_targets_status_check 
  check (status in ('not_submitted','submitted','pending_review','live','rejected','removed'));

alter table public.music_distribution_targets 
  add column if not exists live_url text;

alter table public.music_distribution_targets 
  add column if not exists status_updated_at timestamptz default now();

alter table public.music_distribution_targets 
  add column if not exists notes text;

-- Trigger: when status flips to 'live' with a URL, auto-populate track_universal_links
create or replace function public.sync_distribution_to_universal_link() 
returns trigger language plpgsql security definer
set search_path = public as $$
declare v_track_id uuid;
begin
  if NEW.status = 'live' and NEW.live_url is not null 
     and (OLD.status is distinct from NEW.status or OLD.live_url is distinct from NEW.live_url) then
    select track_id into v_track_id 
      from public.music_distribution_releases where id = NEW.release_id;
    if v_track_id is not null then
      insert into public.track_universal_links (track_id, platform, url)
      values (v_track_id, NEW.platform, NEW.live_url)
      on conflict (track_id, platform) do update set url = excluded.url;
    end if;
  end if;
  NEW.status_updated_at := now();
  return NEW;
end $$;

drop trigger if exists distribution_sync_to_universal_link on public.music_distribution_targets;
create trigger distribution_sync_to_universal_link
  before update on public.music_distribution_targets
  for each row execute function public.sync_distribution_to_universal_link();

-- Update existing release-status sync function to recognize new states
create or replace function public.sync_release_status_from_targets()
returns trigger language plpgsql security definer
set search_path = public as $$
DECLARE
  v_total INT;
  v_live INT;
  v_failed INT;
  v_pending INT;
  v_new_status TEXT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'live'),
    COUNT(*) FILTER (WHERE status IN ('rejected','removed','failed')),
    COUNT(*) FILTER (WHERE status IN ('pending','submitted','processing','pending_review'))
  INTO v_total, v_live, v_failed, v_pending
  FROM public.music_distribution_targets
  WHERE release_id = NEW.release_id;

  IF v_total = 0 THEN
    v_new_status := 'draft';
  ELSIF v_live = v_total THEN
    v_new_status := 'live';
  ELSIF v_pending > 0 THEN
    v_new_status := 'processing';
  ELSIF v_failed > 0 AND v_live = 0 THEN
    v_new_status := 'failed';
  ELSE
    v_new_status := 'partial';
  END IF;

  UPDATE public.music_distribution_releases
  SET status = v_new_status, updated_at = now()
  WHERE id = NEW.release_id;

  RETURN NEW;
END;
$$;