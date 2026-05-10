CREATE TABLE IF NOT EXISTS public.listening_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  current_track_id UUID,
  current_track_url TEXT,
  current_track_title TEXT,
  current_track_artist TEXT,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','ended')),
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parties_status ON public.listening_parties(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parties_host ON public.listening_parties(host_id);
ALTER TABLE public.listening_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties: public read" ON public.listening_parties FOR SELECT USING (true);
CREATE POLICY "Parties: host insert" ON public.listening_parties FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Parties: host update" ON public.listening_parties FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Parties: host delete" ON public.listening_parties FOR DELETE USING (auth.uid() = host_id);
CREATE TRIGGER listening_parties_updated_at BEFORE UPDATE ON public.listening_parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.listening_party_participants (
  party_id UUID NOT NULL REFERENCES public.listening_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, user_id)
);
ALTER TABLE public.listening_party_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants: public read" ON public.listening_party_participants FOR SELECT USING (true);
CREATE POLICY "Participants: self join" ON public.listening_party_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Participants: self leave" ON public.listening_party_participants FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.listening_party_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.listening_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_party_msgs_party ON public.listening_party_messages(party_id, created_at DESC);
ALTER TABLE public.listening_party_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PartyMsgs: public read" ON public.listening_party_messages FOR SELECT USING (true);
CREATE POLICY "PartyMsgs: self insert" ON public.listening_party_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.listening_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listening_party_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listening_party_messages;