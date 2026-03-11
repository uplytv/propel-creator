-- Fix affiliate_links RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "Service role full access affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "Users can insert own affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "Users can update own affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "Users can view own affiliate links" ON affiliate_links;

CREATE POLICY "Users can view own affiliate links" ON affiliate_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliate links" ON affiliate_links
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own affiliate links" ON affiliate_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own affiliate links" ON affiliate_links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access affiliate links" ON affiliate_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix affiliate_conversions RLS
DROP POLICY IF EXISTS "Admins can update conversions" ON affiliate_conversions;
DROP POLICY IF EXISTS "Admins can view all conversions" ON affiliate_conversions;
DROP POLICY IF EXISTS "Service role full access conversions" ON affiliate_conversions;
DROP POLICY IF EXISTS "Users can view own conversions as referrer" ON affiliate_conversions;

CREATE POLICY "Users can view own conversions as referrer" ON affiliate_conversions
  FOR SELECT TO authenticated USING (auth.uid() = referring_user_id);

CREATE POLICY "Admins can view all conversions" ON affiliate_conversions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update conversions" ON affiliate_conversions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access conversions" ON affiliate_conversions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix creator_affiliate_members RLS
DROP POLICY IF EXISTS "Creators can view their program members" ON creator_affiliate_members;
DROP POLICY IF EXISTS "Members can view own affiliate data" ON creator_affiliate_members;
DROP POLICY IF EXISTS "Service role full access creator affiliate members" ON creator_affiliate_members;

CREATE POLICY "Members can view own affiliate data" ON creator_affiliate_members
  FOR SELECT TO authenticated USING (auth.uid() = member_id);

CREATE POLICY "Creators can view their program members" ON creator_affiliate_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM creator_affiliate_programs p
    WHERE p.id = creator_affiliate_members.program_id AND p.creator_id = auth.uid()
  ));

CREATE POLICY "Service role full access creator affiliate members" ON creator_affiliate_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);