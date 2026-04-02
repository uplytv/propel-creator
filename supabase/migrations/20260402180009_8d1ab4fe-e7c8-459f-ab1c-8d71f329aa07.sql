
-- Create newsletter-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('newsletter-images', 'newsletter-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create podcast-audio bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('podcast-audio', 'podcast-audio', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read public newsletter images
CREATE POLICY "Public read newsletter images" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'newsletter-images');

-- RLS: Authenticated users can upload newsletter images
CREATE POLICY "Auth users upload newsletter images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'newsletter-images');

-- RLS: Anyone can read public podcast audio
CREATE POLICY "Public read podcast audio" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'podcast-audio');

-- RLS: Authenticated users can upload podcast audio
CREATE POLICY "Auth users upload podcast audio" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'podcast-audio');
