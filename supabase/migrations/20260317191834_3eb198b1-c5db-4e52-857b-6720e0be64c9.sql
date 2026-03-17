
-- Allow anyone (including unauthenticated) to view active products for purchase
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
TO public
USING (status = 'active');
