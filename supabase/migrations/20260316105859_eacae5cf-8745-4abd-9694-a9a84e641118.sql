
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Owners can view own products"
  ON public.products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
