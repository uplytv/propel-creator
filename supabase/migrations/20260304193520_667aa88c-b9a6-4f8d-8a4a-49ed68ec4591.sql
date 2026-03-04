
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stream_title text NOT NULL,
  objective text NOT NULL,
  objective_label text NOT NULL,
  daily_budget numeric NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 7,
  total_budget numeric NOT NULL DEFAULT 0,
  audience text NOT NULL,
  audience_label text NOT NULL,
  platform text NOT NULL DEFAULT 'meta',
  status text NOT NULL DEFAULT 'active',
  spent numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  cpc numeric NOT NULL DEFAULT 0,
  cpa numeric NOT NULL DEFAULT 0,
  roas numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns" ON public.campaigns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create campaigns" ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON public.campaigns
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns" ON public.campaigns
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
