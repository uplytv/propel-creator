-- 1. Add download_url + file_name to products for digital downloads
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS download_url TEXT,
  ADD COLUMN IF NOT EXISTS download_file_name TEXT;

-- 2. Create private storage bucket for digital downloads (creator uploads, buyers download via signed URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-products', 'digital-products', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies — creators can manage their own files (path prefix = user_id)
DO $$ BEGIN
  CREATE POLICY "Creators can upload own digital products"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'digital-products'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can update own digital products"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'digital-products'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can delete own digital products"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'digital-products'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can view own digital products"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'digital-products'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Note: Buyers never read storage directly. The Edge Function generates a 1h signed URL on purchase
-- using the service role, so no buyer-side SELECT policy is required.