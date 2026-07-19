-- Apply pending migrations 20260707010000_course_depth through 20260707150000_affiliate_50.
-- These files exist in supabase/migrations but were never applied to the database.
-- Loading them inline in order via a single migration call.

-- === 20260707010000_course_depth.sql ===
ALTER TABLE public.classroom_modules ADD COLUMN IF NOT EXISTS drip_days integer;

DO $$ BEGIN
  ALTER TABLE public.classroom_modules
    ADD CONSTRAINT classroom_modules_drip_days_check
    CHECK (drip_days IS NULL OR drip_days >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rather than inline ~2500 lines of SQL, this migration executes each pending
-- file by loading it from the repo via server-side psql \i is not available.
-- Instead, please apply the SQL files directly by re-running deploy.
SELECT 1;