
CREATE TABLE public.music_chart_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chart_type TEXT NOT NULL,
  period TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'global',
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_ref_id UUID NOT NULL,
  item_title TEXT,
  item_subtitle TEXT,
  item_image_url TEXT,
  rank INTEGER NOT NULL,
  prev_rank INTEGER,
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chart_snapshots_lookup ON public.music_chart_snapshots(chart_type, period, region, snapshot_date, rank);

ALTER TABLE public.music_chart_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Charts are publicly viewable"
  ON public.music_chart_snapshots FOR SELECT
  USING (true);
