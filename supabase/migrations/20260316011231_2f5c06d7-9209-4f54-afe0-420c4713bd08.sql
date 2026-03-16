
-- Create live_reactions table
CREATE TABLE IF NOT EXISTS public.live_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live_chat_messages table
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  message TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add energy_score to mux_live_streams if not exists
ALTER TABLE public.mux_live_streams ADD COLUMN IF NOT EXISTS energy_score INTEGER NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS for live_reactions
CREATE POLICY "Anyone can view reactions" ON public.live_reactions FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert reactions" ON public.live_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS for live_chat_messages
CREATE POLICY "Anyone can view chat messages" ON public.live_chat_messages FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert messages" ON public.live_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.live_chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Allow stream owner to pin/unpin messages
CREATE POLICY "Stream owners can update messages" ON public.live_chat_messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.mux_live_streams WHERE id = live_chat_messages.stream_id AND user_id = auth.uid())
);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
