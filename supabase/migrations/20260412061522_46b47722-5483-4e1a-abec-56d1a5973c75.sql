
-- =============================================
-- PROFILES: Add missing social columns
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_in_people boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS people_photos text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_lat numeric(10,7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_lng numeric(10,7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_label text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_online_status boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_level integer DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_xp integer DEFAULT 0;

-- =============================================
-- TICKETS: Add QR + check-in columns
-- =============================================
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS qr_code_data text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number text;

-- =============================================
-- MUX_LIVE_STREAMS: Hype train columns
-- =============================================
ALTER TABLE mux_live_streams ADD COLUMN IF NOT EXISTS hype_train_level integer DEFAULT 0;
ALTER TABLE mux_live_streams ADD COLUMN IF NOT EXISTS hype_train_expires_at timestamptz;

-- =============================================
-- BROADCAST MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  media_url text,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text','image','video','poll','event')),
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  poll_options jsonb,
  poll_votes jsonb DEFAULT '{}',
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own broadcasts" ON broadcast_messages
  FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Followers read broadcasts" ON broadcast_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND following_id = creator_id
    )
    OR auth.uid() = creator_id
  );

-- =============================================
-- GROUP CONVERSATIONS (create table first, policies after group_members)
-- =============================================
CREATE TABLE IF NOT EXISTS group_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  avatar_url text,
  created_by uuid REFERENCES profiles(id),
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE group_conversations ENABLE ROW LEVEL SECURITY;

-- Insert policy first (no dependency on group_members)
CREATE POLICY "Authenticated users can create groups" ON group_conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- =============================================
-- GROUP MEMBERS (must exist before group_conversations SELECT policy)
-- =============================================
CREATE TABLE IF NOT EXISTS group_members (
  conversation_id uuid REFERENCES group_conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.conversation_id = group_members.conversation_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON group_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Now add the SELECT policy on group_conversations that references group_members
CREATE POLICY "Members can view their groups" ON group_conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE conversation_id = id AND user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- =============================================
-- GROUP MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES group_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text,
  media_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read messages" ON group_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE conversation_id = group_messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages" ON group_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE conversation_id = group_messages.conversation_id AND user_id = auth.uid()
    )
  );

-- =============================================
-- MESSAGE REACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id uuid NOT NULL,
  message_type text CHECK (message_type IN ('dm','group')),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, message_type, user_id)
);
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reactions" ON message_reactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read reactions" ON message_reactions
  FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- Enable Realtime for group chat + broadcasts
-- =============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE broadcast_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
