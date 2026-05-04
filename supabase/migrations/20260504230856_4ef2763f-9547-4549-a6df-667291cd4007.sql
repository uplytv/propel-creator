DROP POLICY IF EXISTS "admins read all tv features" ON public.tv_product_features;
CREATE POLICY "admins read all tv features" ON public.tv_product_features
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));