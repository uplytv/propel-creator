-- Add image_url column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

-- Allow anyone to view active products (for creator profiles / discover)
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
TO public
USING (status = 'active');