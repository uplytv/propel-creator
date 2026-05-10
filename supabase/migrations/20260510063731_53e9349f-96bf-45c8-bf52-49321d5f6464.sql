
-- Radio stations
CREATE TABLE public.music_radio_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  genre TEXT,
  is_live BOOLEAN NOT NULL DEFAULT false,
  current_track_id UUID,
  current_started_at TIMESTAMPTZ,
  listeners_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_radio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.music_radio_stations(id) ON DELETE CASCADE,
  track_id UUID NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_radio_tracks_station ON public.music_radio_tracks(station_id, position);

ALTER TABLE public.music_radio_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_radio_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stations viewable by everyone" ON public.music_radio_stations FOR SELECT USING (true);
CREATE POLICY "Owners manage stations" ON public.music_radio_stations FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Radio tracks viewable" ON public.music_radio_tracks FOR SELECT USING (true);
CREATE POLICY "Owners manage radio tracks" ON public.music_radio_tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.music_radio_stations s WHERE s.id = station_id AND s.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.music_radio_stations s WHERE s.id = station_id AND s.owner_id = auth.uid())
);

-- Premieres
CREATE TABLE public.music_premieres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reminders_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_premiere_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premiere_id UUID NOT NULL REFERENCES public.music_premieres(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (premiere_id, user_id)
);

CREATE TABLE public.music_premiere_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premiere_id UUID NOT NULL REFERENCES public.music_premieres(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_premieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_premiere_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_premiere_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premieres viewable" ON public.music_premieres FOR SELECT USING (true);
CREATE POLICY "Creators manage premieres" ON public.music_premieres FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Reminders viewable by self" ON public.music_premiere_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage their reminders" ON public.music_premiere_reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chat viewable" ON public.music_premiere_chat FOR SELECT USING (true);
CREATE POLICY "Users post chat" ON public.music_premiere_chat FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own chat" ON public.music_premiere_chat FOR DELETE USING (auth.uid() = user_id);

-- Live audio rooms
CREATE TABLE public.music_audio_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  topic TEXT,
  is_live BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  listeners_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_audio_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.music_audio_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'listener',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

ALTER TABLE public.music_audio_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_audio_room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms viewable" ON public.music_audio_rooms FOR SELECT USING (true);
CREATE POLICY "Hosts manage rooms" ON public.music_audio_rooms FOR ALL USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Participants viewable" ON public.music_audio_room_participants FOR SELECT USING (true);
CREATE POLICY "Users manage their participation" ON public.music_audio_room_participants FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_radio_stations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_premieres;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_premiere_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_audio_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_audio_room_participants;
