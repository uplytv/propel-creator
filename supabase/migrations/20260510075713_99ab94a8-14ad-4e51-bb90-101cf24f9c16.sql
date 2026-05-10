CREATE TABLE IF NOT EXISTS public.music_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msh own select" ON public.music_search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msh own insert" ON public.music_search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msh own delete" ON public.music_search_history FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_msh_user_created ON public.music_search_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.music_trending_searches (
  query TEXT PRIMARY KEY,
  hits BIGINT NOT NULL DEFAULT 1,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_trending_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trending public read" ON public.music_trending_searches FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.record_music_search(_query TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q TEXT := lower(btrim(_query));
BEGIN
  IF q = '' OR q IS NULL OR length(q) < 2 THEN RETURN; END IF;
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.music_search_history(user_id, query) VALUES (auth.uid(), q);
  END IF;
  INSERT INTO public.music_trending_searches(query, hits, last_searched_at)
  VALUES (q, 1, now())
  ON CONFLICT (query) DO UPDATE
  SET hits = music_trending_searches.hits + 1,
      last_searched_at = now();
END $$;