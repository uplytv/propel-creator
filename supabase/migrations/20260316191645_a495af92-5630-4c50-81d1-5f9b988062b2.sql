
-- Add is_auto_short column to clips table
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS is_auto_short boolean NOT NULL DEFAULT false;

-- Create clip_likes table
CREATE TABLE IF NOT EXISTS public.clip_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(clip_id, user_id)
);

ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view likes
CREATE POLICY "Anyone can view clip likes" ON public.clip_likes
  FOR SELECT TO public USING (true);

-- RLS: Authenticated users can like
CREATE POLICY "Users can like clips" ON public.clip_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS: Users can unlike their own
CREATE POLICY "Users can unlike clips" ON public.clip_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for clip_likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.clip_likes;
