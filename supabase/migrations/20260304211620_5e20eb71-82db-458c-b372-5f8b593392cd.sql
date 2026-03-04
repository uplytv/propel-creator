
-- Job conversations table
CREATE TABLE public.job_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- Job messages table
CREATE TABLE public.job_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.job_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;

-- RLS for job_conversations
CREATE POLICY "Users can view own conversations"
  ON public.job_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = applicant_id);

CREATE POLICY "Users can create conversations"
  ON public.job_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = applicant_id);

-- RLS for job_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.job_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_conversations c
    WHERE c.id = job_messages.conversation_id
    AND (c.creator_id = auth.uid() OR c.applicant_id = auth.uid())
  ));

CREATE POLICY "Users can send messages in their conversations"
  ON public.job_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.job_conversations c
      WHERE c.id = job_messages.conversation_id
      AND (c.creator_id = auth.uid() OR c.applicant_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON public.job_messages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_conversations c
    WHERE c.id = job_messages.conversation_id
    AND (c.creator_id = auth.uid() OR c.applicant_id = auth.uid())
  ));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_messages;

-- Update trigger for conversations
CREATE TRIGGER update_job_conversations_updated_at
  BEFORE UPDATE ON public.job_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
