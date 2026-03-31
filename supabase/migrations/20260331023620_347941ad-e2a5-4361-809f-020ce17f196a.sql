
CREATE TABLE IF NOT EXISTS channel_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, channel_slug)
);

ALTER TABLE channel_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own channel follows" ON channel_follows FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own channel follows" ON channel_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
