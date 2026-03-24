
-- ARIA Agent System Tables

CREATE TABLE IF NOT EXISTS public.aria_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  agent_type text NOT NULL,
  status text DEFAULT 'active',
  tasks_completed integer DEFAULT 0,
  tasks_approved integer DEFAULT 0,
  tasks_rejected integer DEFAULT 0,
  confidence_score numeric DEFAULT 0.5,
  last_active_at timestamp with time zone,
  config jsonb DEFAULT '{}',
  memory jsonb DEFAULT '{}',
  performance_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (creator_id, agent_type)
);

CREATE TABLE IF NOT EXISTS public.aria_agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.aria_agents(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  agent_type text,
  task_type text,
  task_title text,
  status text DEFAULT 'pending',
  confidence numeric DEFAULT 0.5,
  requires_approval boolean DEFAULT false,
  input_data jsonb DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  creator_feedback text,
  was_approved boolean,
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  triggered_by text DEFAULT 'autonomous',
  triggered_by_agent text,
  handoff_to_agent text,
  handoff_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aria_agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  agent_type text,
  memory_type text,
  key text,
  value jsonb,
  confidence numeric DEFAULT 0.5,
  observation_count integer DEFAULT 1,
  last_observed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (creator_id, agent_type, key)
);

CREATE TABLE IF NOT EXISTS public.aria_agent_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent text,
  to_agent text,
  creator_id uuid NOT NULL,
  trigger_task_id uuid REFERENCES public.aria_agent_tasks(id) ON DELETE SET NULL,
  handoff_type text,
  payload jsonb,
  status text DEFAULT 'pending',
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aria_agent_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  agent_type text,
  insight_type text,
  title text,
  body text,
  action_label text,
  action_url text,
  priority integer DEFAULT 5,
  confidence numeric DEFAULT 0.5,
  is_read boolean DEFAULT false,
  expires_at timestamp with time zone,
  source_task_id uuid REFERENCES public.aria_agent_tasks(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aria_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  report_date date,
  content_agent_summary jsonb DEFAULT '{}',
  growth_agent_summary jsonb DEFAULT '{}',
  community_agent_summary jsonb DEFAULT '{}',
  sales_agent_summary jsonb DEFAULT '{}',
  operations_agent_summary jsonb DEFAULT '{}',
  total_tasks_completed integer DEFAULT 0,
  revenue_generated numeric DEFAULT 0,
  members_gained integer DEFAULT 0,
  content_pieces_created integer DEFAULT 0,
  hours_saved numeric DEFAULT 0,
  narrative text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (creator_id, report_date)
);

CREATE TABLE IF NOT EXISTS public.aria_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  name text,
  product_id uuid,
  landing_page_copy jsonb DEFAULT '{}',
  email_sequence jsonb DEFAULT '[]',
  ad_copy jsonb DEFAULT '{}',
  status text DEFAULT 'draft',
  visitors integer DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  created_by text DEFAULT 'growth_ai',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aria_sales_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  visitor_id uuid,
  trigger_event text,
  conversation_log jsonb DEFAULT '[]',
  product_recommended uuid,
  discount_offered numeric DEFAULT 0,
  discount_code text,
  outcome text DEFAULT 'pending',
  revenue_generated numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aria_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  month date,
  api_calls integer DEFAULT 0,
  tokens_used integer DEFAULT 0,
  clips_generated integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  budget_limit integer DEFAULT 500,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (creator_id, month)
);

CREATE TABLE IF NOT EXISTS public.aria_platform_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_type text,
  agent_type text,
  learning_type text,
  key text,
  value jsonb,
  sample_size integer DEFAULT 1,
  confidence numeric DEFAULT 0.5,
  last_updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (creator_type, agent_type, key)
);

-- Enable RLS on all new tables
ALTER TABLE public.aria_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_agent_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_agent_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_sales_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_platform_learnings ENABLE ROW LEVEL SECURITY;

-- RLS policies - creators can manage their own data
CREATE POLICY "Creators manage own agents" ON public.aria_agents FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own tasks" ON public.aria_agent_tasks FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own memory" ON public.aria_agent_memory FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own handoffs" ON public.aria_agent_handoffs FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own insights" ON public.aria_agent_insights FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own reports" ON public.aria_daily_reports FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own funnels" ON public.aria_funnels FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own sales convos" ON public.aria_sales_conversations FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own usage" ON public.aria_usage_tracking FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Platform learnings are public" ON public.aria_platform_learnings FOR SELECT TO authenticated USING (true);

-- Service role policy for edge functions
CREATE POLICY "Service role full access agents" ON public.aria_agents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access tasks" ON public.aria_agent_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access memory" ON public.aria_agent_memory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access handoffs" ON public.aria_agent_handoffs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access insights" ON public.aria_agent_insights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access reports" ON public.aria_daily_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access funnels" ON public.aria_funnels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access sales" ON public.aria_sales_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access usage" ON public.aria_usage_tracking FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access learnings" ON public.aria_platform_learnings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.aria_agent_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aria_agent_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aria_agent_handoffs;

-- Trigger to auto-create 5 agents when a creator space is created
CREATE OR REPLACE FUNCTION public.on_creator_space_created_init_agents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO aria_agents (creator_id, agent_type)
  VALUES
    (NEW.creator_id, 'content'),
    (NEW.creator_id, 'growth'),
    (NEW.creator_id, 'community'),
    (NEW.creator_id, 'sales'),
    (NEW.creator_id, 'operations')
  ON CONFLICT (creator_id, agent_type) DO NOTHING;

  INSERT INTO aria_usage_tracking (creator_id, month, budget_limit)
  VALUES (NEW.creator_id, date_trunc('month', now())::date, 500)
  ON CONFLICT (creator_id, month) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_init_aria_agents
  AFTER INSERT ON public.creator_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.on_creator_space_created_init_agents();
