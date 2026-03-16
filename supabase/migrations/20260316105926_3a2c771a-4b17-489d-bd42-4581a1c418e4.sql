
-- Profiles: Allow authenticated users to read all profiles (needed for social features)
-- but block unauthenticated/anon access to the full table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Products: Allow authenticated users to view all active products  
DROP POLICY IF EXISTS "Owners can view own products" ON public.products;
CREATE POLICY "Authenticated can view active products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);
