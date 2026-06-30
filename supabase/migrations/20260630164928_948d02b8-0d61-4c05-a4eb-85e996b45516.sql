
CREATE POLICY "Admins view all entries" ON public.music_challenge_entries
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all entries" ON public.music_challenge_entries
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete all entries" ON public.music_challenge_entries
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
