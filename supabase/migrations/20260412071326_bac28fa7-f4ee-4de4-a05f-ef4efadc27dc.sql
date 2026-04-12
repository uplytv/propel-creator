
-- Shared plans (create without the cross-reference policy first)
CREATE TABLE public.shared_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  event_id UUID,
  title TEXT NOT NULL DEFAULT 'My Plan',
  description TEXT,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can do everything" ON public.shared_plans FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Shared plan members
CREATE TABLE public.shared_plan_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.shared_plans(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, member_id)
);
ALTER TABLE public.shared_plan_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plan owner and members can read" ON public.shared_plan_members FOR SELECT TO authenticated USING (
  auth.uid() = member_id OR EXISTS (SELECT 1 FROM public.shared_plans WHERE id = plan_id AND owner_id = auth.uid())
);
CREATE POLICY "Plan owner can invite" ON public.shared_plan_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.shared_plans WHERE id = plan_id AND owner_id = auth.uid())
);
CREATE POLICY "Members can update own status" ON public.shared_plan_members FOR UPDATE TO authenticated USING (auth.uid() = member_id);

-- Now add the cross-reference policy on shared_plans
CREATE POLICY "Members can read plans they belong to" ON public.shared_plans FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.shared_plan_members WHERE plan_id = id AND member_id = auth.uid())
);
