
-- Create content_shares table for tracking shares
CREATE TABLE public.content_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  platform TEXT NOT NULL,
  shared_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can view share counts
CREATE POLICY "Anyone can view share counts"
  ON public.content_shares
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can insert shares
CREATE POLICY "Users can track shares"
  ON public.content_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = shared_by_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_shares;
