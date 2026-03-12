
CREATE TABLE public.space_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  mux_playback_id TEXT,
  thumbnail_url TEXT,
  title TEXT,
  duration NUMERIC,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.space_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view space media"
  ON public.space_media FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Creators manage own media"
  ON public.space_media FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);
