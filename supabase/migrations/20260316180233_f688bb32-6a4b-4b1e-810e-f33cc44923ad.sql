
-- Direct conversations table
CREATE TABLE public.direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one UUID NOT NULL,
  participant_two UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (participant_one, participant_two)
);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.direct_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can create conversations" ON public.direct_conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can update own conversations" ON public.direct_conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

-- Direct messages table
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.direct_conversations c
    WHERE c.id = direct_messages.conversation_id
    AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  ));

CREATE POLICY "Users can send messages in their conversations" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE c.id = direct_messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

CREATE POLICY "Users can update messages in their conversations" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.direct_conversations c
    WHERE c.id = direct_messages.conversation_id
    AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  ));

-- Enable realtime for DMs
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_conversations;
