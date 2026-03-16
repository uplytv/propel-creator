
-- Remove the anon/public SELECT policy on profiles (was left over)
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

-- For products: update discovery feed to use the products_public view
-- Keep authenticated policy but the scanner wants revenue/sales hidden from non-owners
-- Use a view approach: authenticated non-owners see products_public, owners see full table
DROP POLICY IF EXISTS "Authenticated can view active products" ON public.products;
CREATE POLICY "Owners can view all own products"
  ON public.products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
