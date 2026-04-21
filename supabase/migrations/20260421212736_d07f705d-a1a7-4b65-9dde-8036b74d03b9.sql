
-- Comments for shorts/clips (polymorphic by source type)
CREATE TABLE IF NOT EXISTS public.short_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('clip','short')),
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS short_comments_short_id_idx ON public.short_comments(short_id, created_at DESC);

ALTER TABLE public.short_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read short comments"
  ON public.short_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post their own short comments"
  ON public.short_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own short comments"
  ON public.short_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own short comments"
  ON public.short_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.short_comments;
