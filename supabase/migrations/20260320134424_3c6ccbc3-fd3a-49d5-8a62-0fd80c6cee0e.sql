
-- FIX 1: Drop duplicate slug trigger on events table (keep auto_slug_events)
DROP TRIGGER IF EXISTS set_event_slug ON public.events;

-- FIX 7: Add sent_at to stream_reminders and reminded_at to event_reminders
ALTER TABLE public.stream_reminders ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.event_reminders ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

-- FIX 8: Add notified_at to event_waitlist for expiry tracking
ALTER TABLE public.event_waitlist ADD COLUMN IF NOT EXISTS notified_at timestamptz;
