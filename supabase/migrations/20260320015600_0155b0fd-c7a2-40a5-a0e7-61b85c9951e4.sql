
-- Feature 2: Scheduled Streams
CREATE TABLE IF NOT EXISTS public.scheduled_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  stream_id UUID REFERENCES public.mux_live_streams(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  reminder_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stream_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scheduled_stream_id UUID REFERENCES public.scheduled_streams(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scheduled_stream_id)
);

ALTER TABLE public.scheduled_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scheduled streams" ON public.scheduled_streams FOR SELECT USING (true);
CREATE POLICY "Creators manage own scheduled streams" ON public.scheduled_streams FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators update own scheduled streams" ON public.scheduled_streams FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "Creators delete own scheduled streams" ON public.scheduled_streams FOR DELETE USING (creator_id = auth.uid());

CREATE POLICY "Anyone can view reminders" ON public.stream_reminders FOR SELECT USING (true);
CREATE POLICY "Users set own reminders" ON public.stream_reminders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own reminders" ON public.stream_reminders FOR DELETE USING (user_id = auth.uid());

-- Feature 3: Paid DMs
CREATE TABLE IF NOT EXISTS public.paid_dms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  message TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  platform_fee NUMERIC DEFAULT 0,
  creator_earnings NUMERIC DEFAULT 0,
  stripe_payment_intent_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.paid_dm_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID REFERENCES public.paid_dms(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.paid_dms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_dm_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender and creator can view DMs" ON public.paid_dms FOR SELECT USING (sender_id = auth.uid() OR creator_id = auth.uid());
CREATE POLICY "Authenticated users can send DMs" ON public.paid_dms FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Creator can update own DMs" ON public.paid_dms FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Sender and creator can view replies" ON public.paid_dm_replies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.paid_dms WHERE id = dm_id AND (sender_id = auth.uid() OR creator_id = auth.uid()))
);
CREATE POLICY "Creator can reply to DMs" ON public.paid_dm_replies FOR INSERT WITH CHECK (creator_id = auth.uid());

-- Feature 4: Free Trial - add trial_days to subscription_tiers
ALTER TABLE public.subscription_tiers ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;

-- Feature 3: Add paid DM settings to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paid_dms_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paid_dm_price NUMERIC DEFAULT 5;

-- Feature 9: Transcription tables
CREATE TABLE IF NOT EXISTS public.stream_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_recording_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  transcript_text TEXT DEFAULT '',
  transcript_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shorts_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_recording_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stream_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shorts_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can view own transcripts" ON public.stream_transcripts FOR SELECT USING (creator_id = auth.uid());
CREATE POLICY "Service can insert transcripts" ON public.stream_transcripts FOR INSERT WITH CHECK (true);

CREATE POLICY "Creator can view own shorts queue" ON public.shorts_queue FOR SELECT USING (creator_id = auth.uid());
CREATE POLICY "Service can insert shorts queue" ON public.shorts_queue FOR INSERT WITH CHECK (true);

-- Enable realtime for scheduled streams
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.paid_dms;
