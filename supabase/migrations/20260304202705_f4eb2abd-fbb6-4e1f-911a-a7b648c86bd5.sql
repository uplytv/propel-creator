
CREATE TABLE public.campaign_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  spent numeric NOT NULL DEFAULT 0
);

CREATE INDEX idx_campaign_metrics_campaign ON public.campaign_metrics(campaign_id, recorded_at);

ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
  ON public.campaign_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert metrics"
  ON public.campaign_metrics FOR INSERT
  WITH CHECK (true);
