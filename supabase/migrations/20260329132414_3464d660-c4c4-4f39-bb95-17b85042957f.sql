
-- Simulcast destination keys stored per creator
CREATE TABLE IF NOT EXISTS creator_stream_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  platform text NOT NULL,
  platform_label text,
  rtmp_url text NOT NULL,
  stream_key_encrypted text NOT NULL,
  stream_key_last_four text,
  is_enabled boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  key_created_at timestamp DEFAULT now(),
  key_rotation_reminded_at timestamp,
  last_used_at timestamp,
  created_at timestamp DEFAULT now(),
  UNIQUE(creator_id, platform)
);

-- Simulcast session tracking per stream per platform
CREATE TABLE IF NOT EXISTS stream_simulcast_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid,
  creator_id uuid,
  platform text NOT NULL,
  mux_simulcast_id text,
  rtmp_url text,
  status text DEFAULT 'connecting',
  retry_count integer DEFAULT 0,
  started_at timestamp,
  ended_at timestamp,
  error_message text,
  created_at timestamp DEFAULT now()
);

-- Test connection audit log
CREATE TABLE IF NOT EXISTS simulcast_test_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid,
  platform text NOT NULL,
  status text NOT NULL,
  error_message text,
  tested_at timestamp DEFAULT now()
);

-- Enable realtime on simulcast sessions
ALTER PUBLICATION supabase_realtime ADD TABLE stream_simulcast_sessions;

-- RLS policies
ALTER TABLE creator_stream_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_simulcast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulcast_test_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own destinations" ON creator_stream_destinations
  FOR ALL TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users view own simulcast sessions" ON stream_simulcast_sessions
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Service role manages simulcast sessions" ON stream_simulcast_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users view own test logs" ON simulcast_test_log
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Service role manages test logs" ON simulcast_test_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Key rotation check function
CREATE OR REPLACE FUNCTION check_simulcast_key_rotation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  days_old integer;
BEGIN
  FOR r IN
    SELECT d.id, d.creator_id, d.platform, d.key_created_at
    FROM creator_stream_destinations d
    WHERE d.key_created_at < now() - interval '90 days'
      AND (d.key_rotation_reminded_at IS NULL OR d.key_rotation_reminded_at < now() - interval '30 days')
      AND d.is_enabled = true
  LOOP
    days_old := EXTRACT(DAY FROM now() - r.key_created_at)::integer;
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      r.creator_id,
      'simulcast_key_rotation',
      '🔑 Time to rotate your ' || r.platform || ' stream key',
      'Your ' || r.platform || ' stream key is ' || days_old || ' days old. Rotating it regularly keeps your stream secure. Update it in Settings → Simulcast.',
      '/settings?tab=simulcast'
    );
    UPDATE creator_stream_destinations SET key_rotation_reminded_at = now() WHERE id = r.id;
  END LOOP;
END;
$$;
