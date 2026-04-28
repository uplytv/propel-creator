-- SmartLinks core
CREATE TABLE public.smart_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  link_type TEXT NOT NULL DEFAULT 'music' CHECK (link_type IN ('music','event','podcast','product','presave')),
  title TEXT NOT NULL,
  artist TEXT,
  description TEXT,
  cover_image_url TEXT,
  platforms JSONB NOT NULL DEFAULT '{}'::jsonb,
  release_date TIMESTAMPTZ,
  is_presave BOOLEAN NOT NULL DEFAULT false,
  presave_converted BOOLEAN NOT NULL DEFAULT false,
  fallback_url TEXT,
  capture_email BOOLEAN NOT NULL DEFAULT false,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smart_links_creator ON public.smart_links(creator_id);
CREATE INDEX idx_smart_links_slug ON public.smart_links(slug);
CREATE INDEX idx_smart_links_release ON public.smart_links(release_date) WHERE is_presave = true AND presave_converted = false;

ALTER TABLE public.smart_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Smart links are publicly viewable"
  ON public.smart_links FOR SELECT USING (true);

CREATE POLICY "Creators can insert their own smart links"
  ON public.smart_links FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own smart links"
  ON public.smart_links FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own smart links"
  ON public.smart_links FOR DELETE USING (auth.uid() = creator_id);

CREATE TRIGGER update_smart_links_updated_at
  BEFORE UPDATE ON public.smart_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Click tracking
CREATE TABLE public.smart_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  platform TEXT,
  country TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smart_link_clicks_link ON public.smart_link_clicks(link_id, clicked_at DESC);
CREATE INDEX idx_smart_link_clicks_platform ON public.smart_link_clicks(link_id, platform);

ALTER TABLE public.smart_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log clicks"
  ON public.smart_link_clicks FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can view their own click data"
  ON public.smart_link_clicks FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.smart_links sl WHERE sl.id = link_id AND sl.creator_id = auth.uid())
  );

-- Presaves
CREATE TABLE public.smart_link_presaves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  fan_email TEXT,
  fan_name TEXT,
  provider TEXT NOT NULL DEFAULT 'spotify' CHECK (provider IN ('spotify','apple')),
  spotify_user_id TEXT,
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  spotify_token_expires_at TIMESTAMPTZ,
  spotify_track_id TEXT,
  spotify_album_id TEXT,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smart_link_presaves_link ON public.smart_link_presaves(link_id);
CREATE INDEX idx_smart_link_presaves_pending ON public.smart_link_presaves(link_id) WHERE converted_at IS NULL;

ALTER TABLE public.smart_link_presaves ENABLE ROW LEVEL SECURITY;

-- Inserts go through edge function with service role; restrict direct client access
CREATE POLICY "Creators can view presaves on their links"
  ON public.smart_link_presaves FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.smart_links sl WHERE sl.id = link_id AND sl.creator_id = auth.uid())
  );

-- Email captures
CREATE TABLE public.smart_link_email_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(link_id, email)
);

CREATE INDEX idx_smart_link_email_captures_link ON public.smart_link_email_captures(link_id);

ALTER TABLE public.smart_link_email_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an email"
  ON public.smart_link_email_captures FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can view emails captured on their links"
  ON public.smart_link_email_captures FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.smart_links sl WHERE sl.id = link_id AND sl.creator_id = auth.uid())
  );

-- Public storage bucket for cover art
INSERT INTO storage.buckets (id, name, public)
VALUES ('smart-links', 'smart-links', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Smart link cover art is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'smart-links');

CREATE POLICY "Creators can upload their own smart link cover art"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'smart-links' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Creators can update their own smart link cover art"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'smart-links' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Creators can delete their own smart link cover art"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'smart-links' AND auth.uid()::text = (storage.foldername(name))[1]);