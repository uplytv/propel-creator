
-- 1. Business categories table
CREATE TABLE public.business_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦',
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.business_categories
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage categories" ON public.business_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Feature registry
CREATE TABLE public.feature_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  core TEXT NOT NULL CHECK (core IN ('space', 'learn', 'live', 'earn', 'aria')),
  tier TEXT NOT NULL CHECK (tier IN ('core', 'embedded', 'advanced')),
  dependencies TEXT[] NOT NULL DEFAULT '{}',
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view features" ON public.feature_registry
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage features" ON public.feature_registry
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Category feature defaults (which features are ON/OFF per category)
CREATE TABLE public.category_feature_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.business_categories(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES public.feature_registry(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (category_id, feature_key)
);

ALTER TABLE public.category_feature_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view defaults" ON public.category_feature_defaults
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage defaults" ON public.category_feature_defaults
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. User feature overrides (per-user overrides on top of category defaults)
CREATE TABLE public.user_feature_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_key TEXT NOT NULL REFERENCES public.feature_registry(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  overridden_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key)
);

ALTER TABLE public.user_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own overrides" ON public.user_feature_overrides
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all overrides" ON public.user_feature_overrides
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage overrides" ON public.user_feature_overrides
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Feature audit log
CREATE TABLE public.feature_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  feature_key TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON public.feature_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log" ON public.feature_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Add business_category and user_type to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT;
