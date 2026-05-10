
CREATE TABLE public.music_distribution_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  track_id UUID,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  upc TEXT,
  isrc TEXT,
  release_date DATE,
  artwork_url TEXT,
  audio_url TEXT,
  genre TEXT,
  language TEXT DEFAULT 'en',
  explicit BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_distribution_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.music_distribution_releases(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  external_url TEXT,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (release_id, platform)
);

CREATE INDEX idx_mdr_owner ON public.music_distribution_releases(owner_id);
CREATE INDEX idx_mdr_status ON public.music_distribution_releases(status);
CREATE INDEX idx_mdt_release ON public.music_distribution_targets(release_id);
CREATE INDEX idx_mdt_platform_status ON public.music_distribution_targets(platform, status);

ALTER TABLE public.music_distribution_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_distribution_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage releases"
ON public.music_distribution_releases
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Public views live releases"
ON public.music_distribution_releases
FOR SELECT
USING (status = 'live');

CREATE POLICY "Owners manage targets"
ON public.music_distribution_targets
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.music_distribution_releases r
  WHERE r.id = release_id AND r.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.music_distribution_releases r
  WHERE r.id = release_id AND r.owner_id = auth.uid()
));

CREATE POLICY "Public views targets of live releases"
ON public.music_distribution_targets
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.music_distribution_releases r
  WHERE r.id = release_id AND r.status = 'live'
));

CREATE TRIGGER update_mdr_updated_at
BEFORE UPDATE ON public.music_distribution_releases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mdt_updated_at
BEFORE UPDATE ON public.music_distribution_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_release_status_from_targets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_live INT;
  v_failed INT;
  v_pending INT;
  v_new_status TEXT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'live'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status IN ('pending','submitted','processing'))
  INTO v_total, v_live, v_failed, v_pending
  FROM public.music_distribution_targets
  WHERE release_id = NEW.release_id;

  IF v_total = 0 THEN
    v_new_status := 'draft';
  ELSIF v_live = v_total THEN
    v_new_status := 'live';
  ELSIF v_pending > 0 THEN
    v_new_status := 'processing';
  ELSIF v_failed > 0 AND v_live = 0 THEN
    v_new_status := 'failed';
  ELSE
    v_new_status := 'partial';
  END IF;

  UPDATE public.music_distribution_releases
  SET status = v_new_status, updated_at = now()
  WHERE id = NEW.release_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_release_status
AFTER INSERT OR UPDATE OF status ON public.music_distribution_targets
FOR EACH ROW EXECUTE FUNCTION public.sync_release_status_from_targets();
