
-- Per-user search history
CREATE TABLE public.music_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_music_search_history_user_created
  ON public.music_search_history (user_id, created_at DESC);

ALTER TABLE public.music_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own searches"
  ON public.music_search_history FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "users insert own searches"
  ON public.music_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own searches"
  ON public.music_search_history FOR DELETE
  USING (auth.uid() = user_id);

-- Editorial spotlights (admin-curated)
CREATE TABLE public.music_editorial_spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  cover_url TEXT,
  link_path TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_editorial_spotlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spotlights publicly viewable"
  ON public.music_editorial_spotlights FOR SELECT
  USING (true);

CREATE POLICY "admins manage spotlights"
  ON public.music_editorial_spotlights FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
