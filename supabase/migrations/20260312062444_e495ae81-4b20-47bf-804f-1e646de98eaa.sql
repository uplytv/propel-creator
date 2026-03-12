
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create social_links table
CREATE TABLE IF NOT EXISTS public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- Anyone can view social links (public profiles)
CREATE POLICY "Anyone can view social links" ON public.social_links
  FOR SELECT TO public USING (true);

-- Users can manage own social links
CREATE POLICY "Users can manage own social links" ON public.social_links
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create covers storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;

-- Storage policies for covers
CREATE POLICY "Anyone can view covers" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'covers');

CREATE POLICY "Users can upload covers" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own covers" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own covers" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Also add cover_image_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_image_url text;
