
-- Add live event selling columns to mux_live_streams
ALTER TABLE mux_live_streams
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE mux_live_streams
  ADD COLUMN IF NOT EXISTS is_event_stream boolean DEFAULT false;
ALTER TABLE mux_live_streams
  ADD COLUMN IF NOT EXISTS venue_attendance_count integer DEFAULT 0;
ALTER TABLE mux_live_streams
  ADD COLUMN IF NOT EXISTS tickets_sold_during_stream integer DEFAULT 0;

-- Add purchased_from to tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'purchased_from'
  ) THEN
    ALTER TABLE tickets ADD COLUMN purchased_from text DEFAULT 'direct';
  END IF;
END$$;

-- Create index for efficient event stream lookups
CREATE INDEX IF NOT EXISTS idx_mux_live_streams_event_id ON mux_live_streams(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mux_live_streams_event_stream ON mux_live_streams(is_event_stream, status) WHERE is_event_stream = true;
