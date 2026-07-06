-- ═══════════════════════════════════════════════════════════════════════════
-- Classroom lessons: Skool-parity richer lessons + resilient video state.
--
-- WHY: Uploaded lessons stored `mux_asset_id = 'pending'` and
-- `video_url = 'upload:<uploadId>'` and NOTHING ever wrote the real asset /
-- playback id back onto the lesson after Mux finished processing (the Mux
-- webhook only updates `mux_assets`, keyed by upload_id). The player resolved
-- playback by the sentinel `mux_asset_id = 'pending'`, which never matched, so
-- lessons rendered a blank `<video src="upload:...">`. A single orphaned
-- errored `pending` asset also painted every in-flight lesson with an "Error"
-- badge (all pending uploads collapse to the one "pending" key).
--
-- FIX (data model): store the upload id and resolved playback id + status
-- directly on the lesson so playback is bulletproof and self-healing, and add
-- resource links (attachments) shown under each lesson.
--
-- Additive only. No destructive drops. Existing lessons keep working.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.classroom_lessons
  add column if not exists lesson_links   jsonb not null default '[]'::jsonb,
  add column if not exists mux_upload_id  text,
  add column if not exists mux_playback_id text,
  add column if not exists video_status   text;

comment on column public.classroom_lessons.lesson_links is
  'Array of {label, url} resource links (attachments) shown under the lesson.';
comment on column public.classroom_lessons.mux_upload_id is
  'Mux direct-upload id — the reliable key used to resolve/self-heal the asset once Mux finishes processing.';
comment on column public.classroom_lessons.mux_playback_id is
  'Resolved Mux playback id, written back once the asset is ready. Lets the player render without a fragile join.';
comment on column public.classroom_lessons.video_status is
  'ready | processing | errored | null — surfaced in the UI so a stuck upload never shows a broken player.';

-- RLS already governs classroom_lessons (owner CRUD + gated member read). New
-- columns inherit the existing table policies; re-assert RLS idempotently so
-- this migration is self-contained per the no-table-without-RLS rule.
alter table public.classroom_lessons enable row level security;
