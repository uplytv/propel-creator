CREATE TABLE IF NOT EXISTS public.artist_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_url TEXT,
  target TEXT NOT NULL DEFAULT 'all' CHECK (target IN ('all','superfans','buyers')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.artist_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages public read" ON public.artist_messages FOR SELECT USING (true);
CREATE POLICY "artist insert own messages" ON public.artist_messages FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "artist update own messages" ON public.artist_messages FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "artist delete own messages" ON public.artist_messages FOR DELETE USING (auth.uid() = artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_msg_artist ON public.artist_messages(artist_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS public.artist_message_reads (
  message_id UUID NOT NULL REFERENCES public.artist_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
ALTER TABLE public.artist_message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reads own select" ON public.artist_message_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reads own insert" ON public.artist_message_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reads own delete" ON public.artist_message_reads FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.music_notification_prefs (
  user_id UUID PRIMARY KEY,
  new_release BOOLEAN NOT NULL DEFAULT true,
  drop_reminders BOOLEAN NOT NULL DEFAULT true,
  artist_messages BOOLEAN NOT NULL DEFAULT true,
  concert_reminders BOOLEAN NOT NULL DEFAULT true,
  weekly_digest BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "music notif own select" ON public.music_notification_prefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "music notif own insert" ON public.music_notification_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "music notif own update" ON public.music_notification_prefs FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_music_notif_updated BEFORE UPDATE ON public.music_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();