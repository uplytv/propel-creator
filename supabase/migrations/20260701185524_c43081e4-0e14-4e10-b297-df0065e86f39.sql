CREATE POLICY "Admins read all blake subscribers"
  ON public.blake_subscribers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));