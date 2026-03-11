-- Fix creator_affiliate_programs RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view active programs" ON creator_affiliate_programs;
DROP POLICY IF EXISTS "Creators can manage own program" ON creator_affiliate_programs;

CREATE POLICY "Anyone can view active programs" ON creator_affiliate_programs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Creators can manage own program" ON creator_affiliate_programs
  FOR ALL TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);