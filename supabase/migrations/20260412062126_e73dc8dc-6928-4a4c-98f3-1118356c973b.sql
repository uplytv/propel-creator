-- profiles extras
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS heydar_active_until timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_online_status boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_level integer DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_xp integer DEFAULT 0;

-- tickets QR
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS qr_code_data text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number text;

-- hype train
ALTER TABLE mux_live_streams ADD COLUMN IF NOT EXISTS hype_train_level integer DEFAULT 0;
ALTER TABLE mux_live_streams ADD COLUMN IF NOT EXISTS hype_train_expires_at timestamptz;

-- Stories bucket policies (bucket already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users upload stories' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users upload stories" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read stories' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public read stories" ON storage.objects
      FOR SELECT USING (bucket_id = 'stories');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own stories' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users delete own stories" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- Event waitlist table
CREATE TABLE IF NOT EXISTS event_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE event_waitlist ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own waitlist' AND tablename = 'event_waitlist') THEN
    CREATE POLICY "Users manage own waitlist" ON event_waitlist
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
