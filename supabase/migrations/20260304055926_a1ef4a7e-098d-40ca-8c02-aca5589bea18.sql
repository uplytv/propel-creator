
-- Add credits_balance column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 100;

-- Create tip_transactions table
CREATE TABLE public.tip_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  amount integer NOT NULL,
  message text,
  stream_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tip_transactions ENABLE ROW LEVEL SECURITY;

-- Users can insert tips (they are the sender)
CREATE POLICY "Users can send tips" ON public.tip_transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users can view tips they sent or received
CREATE POLICY "Users can view own tips" ON public.tip_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
