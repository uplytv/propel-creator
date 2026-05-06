ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS ticketing_mode text NOT NULL DEFAULT 'ticketed'
    CHECK (ticketing_mode IN ('ticketed','free_rsvp','seated')),
  ADD COLUMN IF NOT EXISTS seat_map jsonb;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS seat_label text;

-- Backfill: free events that pre-existed are RSVP, paid stay ticketed
UPDATE public.events
   SET ticketing_mode = CASE WHEN is_free THEN 'free_rsvp' ELSE 'ticketed' END
 WHERE ticketing_mode = 'ticketed' AND created_at < now();

CREATE UNIQUE INDEX IF NOT EXISTS tickets_event_seat_unique
  ON public.tickets (event_id, seat_label)
  WHERE seat_label IS NOT NULL AND status IN ('active','listed_for_resale','scanned','used');
