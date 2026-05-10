
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS isrc text,
  ADD COLUMN IF NOT EXISTS iswc text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS copyright_notice text;

CREATE TABLE IF NOT EXISTS public.track_royalty_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'artist',
  percent numeric(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, collaborator_id)
);

ALTER TABLE public.track_royalty_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Track owner manages splits"
  ON public.track_royalty_splits FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.creator_id = auth.uid()));

CREATE POLICY "Collaborators view own splits"
  ON public.track_royalty_splits FOR SELECT
  USING (collaborator_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_track_royalty_splits_track ON public.track_royalty_splits(track_id);
CREATE INDEX IF NOT EXISTS idx_track_royalty_splits_collab ON public.track_royalty_splits(collaborator_id);

CREATE TABLE IF NOT EXISTS public.track_distribution_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  external_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.track_distribution_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist manages own exports"
  ON public.track_distribution_exports FOR ALL
  USING (artist_id = auth.uid())
  WITH CHECK (artist_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_track_dist_exports_track ON public.track_distribution_exports(track_id);
CREATE INDEX IF NOT EXISTS idx_track_dist_exports_artist ON public.track_distribution_exports(artist_id);

CREATE OR REPLACE FUNCTION public.update_track_dist_export_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_track_dist_exports_updated ON public.track_distribution_exports;
CREATE TRIGGER trg_track_dist_exports_updated
  BEFORE UPDATE ON public.track_distribution_exports
  FOR EACH ROW EXECUTE FUNCTION public.update_track_dist_export_updated_at();
