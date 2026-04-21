-- Growth Plans (one per creator, editable)
CREATE TABLE public.growth_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'My 30-Day Growth Plan',
  duration_days INTEGER NOT NULL DEFAULT 30,
  target_kpis JSONB NOT NULL DEFAULT '{}'::jsonb,
  weekly_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(creator_id)
);

CREATE INDEX idx_growth_plans_creator ON public.growth_plans(creator_id);

ALTER TABLE public.growth_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own growth plan"
  ON public.growth_plans FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators insert own growth plan"
  ON public.growth_plans FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators update own growth plan"
  ON public.growth_plans FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators delete own growth plan"
  ON public.growth_plans FOR DELETE
  USING (auth.uid() = creator_id);

CREATE TRIGGER update_growth_plans_updated_at
  BEFORE UPDATE ON public.growth_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Version history
CREATE TABLE public.growth_plan_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.growth_plans(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  version_name TEXT,
  is_named_milestone BOOLEAN NOT NULL DEFAULT false,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_growth_plan_versions_plan ON public.growth_plan_versions(plan_id, created_at DESC);
CREATE INDEX idx_growth_plan_versions_creator ON public.growth_plan_versions(creator_id);

ALTER TABLE public.growth_plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own plan versions"
  ON public.growth_plan_versions FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators insert own plan versions"
  ON public.growth_plan_versions FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators update own plan versions"
  ON public.growth_plan_versions FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators delete own plan versions"
  ON public.growth_plan_versions FOR DELETE
  USING (auth.uid() = creator_id);