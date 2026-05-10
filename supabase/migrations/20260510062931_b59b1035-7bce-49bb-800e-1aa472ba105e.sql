
-- Parties
CREATE TABLE IF NOT EXISTS public.music_listening_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  share_code TEXT NOT NULL UNIQUE,
  title TEXT,
  current_track_id UUID,
  position_seconds NUMERIC NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parties_active ON public.music_listening_parties(is_active, created_at DESC);

ALTER TABLE public.music_listening_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active parties"
  ON public.music_listening_parties FOR SELECT USING (true);

CREATE POLICY "Users can host parties"
  ON public.music_listening_parties FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host updates own party"
  ON public.music_listening_parties FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Host deletes own party"
  ON public.music_listening_parties FOR DELETE USING (auth.uid() = host_id);

-- Members
CREATE TABLE IF NOT EXISTS public.music_party_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.music_listening_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (party_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_party_members_party ON public.music_party_members(party_id);

ALTER TABLE public.music_party_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view party members"
  ON public.music_party_members FOR SELECT USING (true);

CREATE POLICY "Users join parties"
  ON public.music_party_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users leave parties"
  ON public.music_party_members FOR DELETE USING (auth.uid() = user_id);

-- Shared queue
CREATE TABLE IF NOT EXISTS public.music_party_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.music_listening_parties(id) ON DELETE CASCADE,
  track_id UUID NOT NULL,
  added_by UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_party_queue_party ON public.music_party_queue(party_id, position);

ALTER TABLE public.music_party_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view party queue"
  ON public.music_party_queue FOR SELECT USING (true);

CREATE POLICY "Members add to queue"
  ON public.music_party_queue FOR INSERT WITH CHECK (
    auth.uid() = added_by AND (
      EXISTS (SELECT 1 FROM public.music_party_members m WHERE m.party_id = music_party_queue.party_id AND m.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.music_listening_parties p WHERE p.id = music_party_queue.party_id AND p.host_id = auth.uid())
    )
  );

CREATE POLICY "Contributor or host removes queue item"
  ON public.music_party_queue FOR DELETE USING (
    auth.uid() = added_by
    OR EXISTS (SELECT 1 FROM public.music_listening_parties p WHERE p.id = music_party_queue.party_id AND p.host_id = auth.uid())
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_listening_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_party_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_party_queue;
