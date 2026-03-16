
CREATE TABLE public.weekly_growth_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  report_content TEXT NOT NULL,
  highlights JSONB DEFAULT '[]'::jsonb,
  action_item TEXT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.weekly_growth_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.weekly_growth_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON public.weekly_growth_reports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert reports" ON public.weekly_growth_reports
  FOR INSERT TO service_role WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_growth_reports;
