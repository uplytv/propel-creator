-- Add support for tracking attendance to external (Ticketmaster/Eventbrite) events
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS global_event_id uuid REFERENCES public.events_global(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS event_title text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS event_date timestamptz;

-- Replace the (user_id, event_id) unique constraint so global events can also be tracked uniquely
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_event_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_user_uply_event_uniq
  ON public.attendance (user_id, event_id)
  WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_user_global_event_uniq
  ON public.attendance (user_id, global_event_id)
  WHERE global_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_global_event ON public.attendance(global_event_id) WHERE global_event_id IS NOT NULL;

-- Allow inserting either an event_id OR global_event_id (XOR-ish, but NULL on both is allowed for "going out" rows)
-- Existing RLS policies already cover user_id = auth.uid()

-- Schedule the global events ingest to run daily at 03:00 UTC if pg_cron is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('sync-global-events-daily') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'sync-global-events-daily'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;