
-- Fix restrictive policies on feature system tables
-- The "Anyone can view" policies need to be PERMISSIVE, not RESTRICTIVE

-- business_categories: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Anyone can view categories" ON public.business_categories;
CREATE POLICY "Anyone can view categories" ON public.business_categories FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.business_categories;
CREATE POLICY "Admins can manage categories" ON public.business_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- feature_registry: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Anyone can view features" ON public.feature_registry;
CREATE POLICY "Anyone can view features" ON public.feature_registry FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage features" ON public.feature_registry;
CREATE POLICY "Admins can manage features" ON public.feature_registry FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- category_feature_defaults: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Anyone can view defaults" ON public.category_feature_defaults;
CREATE POLICY "Anyone can view defaults" ON public.category_feature_defaults FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage defaults" ON public.category_feature_defaults;
CREATE POLICY "Admins can manage defaults" ON public.category_feature_defaults FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_feature_overrides: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can manage own overrides" ON public.user_feature_overrides;
CREATE POLICY "Users can manage own overrides" ON public.user_feature_overrides FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- feature_audit_log: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Admins can view audit log" ON public.feature_audit_log;
CREATE POLICY "Admins can view audit log" ON public.feature_audit_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert audit log" ON public.feature_audit_log;
CREATE POLICY "Admins can insert audit log" ON public.feature_audit_log FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
