
-- Create community_blasts table
CREATE TABLE public.community_blasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.creator_spaces(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  media_type TEXT,
  media_url TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add last_blast_sent_at to creator_spaces
ALTER TABLE public.creator_spaces ADD COLUMN IF NOT EXISTS last_blast_sent_at TIMESTAMPTZ;

-- Add email_opt_in and last_emailed_at to community_members
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMPTZ;

-- Enable RLS on community_blasts
ALTER TABLE public.community_blasts ENABLE ROW LEVEL SECURITY;

-- RLS: creators can manage their own blasts
CREATE POLICY "Creators can manage own blasts"
  ON public.community_blasts
  FOR ALL
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- RLS: members can read blasts from communities they belong to
CREATE POLICY "Members can read blasts"
  ON public.community_blasts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.creator_id = community_blasts.creator_id
        AND cm.user_id = auth.uid()
    )
  );

-- Enable realtime for community_blasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_blasts;

-- Create blast-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('blast-media', 'blast-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to blast-media
CREATE POLICY "Authenticated users can upload blast media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blast-media');

CREATE POLICY "Public can read blast media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'blast-media');

CREATE POLICY "Owners can delete blast media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blast-media' AND (storage.foldername(name))[1] = auth.uid()::text);
