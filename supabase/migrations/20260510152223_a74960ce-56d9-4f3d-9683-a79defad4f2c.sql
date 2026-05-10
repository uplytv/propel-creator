
CREATE TABLE IF NOT EXISTS public.music_show_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mst_show ON public.music_show_tips(show_id);
CREATE INDEX IF NOT EXISTS idx_mst_artist ON public.music_show_tips(artist_id);
CREATE INDEX IF NOT EXISTS idx_mst_fan ON public.music_show_tips(fan_id);

ALTER TABLE public.music_show_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tips viewable by authenticated users"
  ON public.music_show_tips FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Fans create own tips"
  ON public.music_show_tips FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Fans update own tips"
  ON public.music_show_tips FOR UPDATE
  TO authenticated USING (auth.uid() = fan_id);

CREATE POLICY "Fans delete own tips"
  ON public.music_show_tips FOR DELETE
  TO authenticated USING (auth.uid() = fan_id);

CREATE TRIGGER trg_mst_updated_at
  BEFORE UPDATE ON public.music_show_tips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.music_show_tip_leaderboard
WITH (security_invoker = true) AS
SELECT
  show_id,
  fan_id,
  SUM(amount_cents)::BIGINT AS total_cents,
  COUNT(*)::INTEGER AS tip_count,
  MAX(created_at) AS last_tip_at,
  RANK() OVER (PARTITION BY show_id ORDER BY SUM(amount_cents) DESC) AS rank
FROM public.music_show_tips
GROUP BY show_id, fan_id;
