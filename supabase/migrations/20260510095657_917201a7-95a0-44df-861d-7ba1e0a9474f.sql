
CREATE TABLE public.music_publishing_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  track_id UUID,
  release_id UUID,
  isrc TEXT,
  upc TEXT,
  iswc TEXT,
  pro_name TEXT,
  pro_member_id TEXT,
  publisher_name TEXT,
  publisher_share NUMERIC,
  writer_share NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_pro_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.music_publishing_registrations(id) ON DELETE CASCADE,
  work_title TEXT NOT NULL,
  work_id_external TEXT,
  pro_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_publishing_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_pro_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own publishing registrations"
ON public.music_publishing_registrations
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Public can view confirmed registrations"
ON public.music_publishing_registrations
FOR SELECT
USING (status = 'confirmed');

CREATE POLICY "Owners manage works of their registrations"
ON public.music_pro_works
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.music_publishing_registrations r
  WHERE r.id = registration_id AND r.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.music_publishing_registrations r
  WHERE r.id = registration_id AND r.owner_id = auth.uid()
));

CREATE TRIGGER update_music_publishing_registrations_updated_at
BEFORE UPDATE ON public.music_publishing_registrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_music_pub_reg_owner ON public.music_publishing_registrations(owner_id);
CREATE INDEX idx_music_pub_reg_track ON public.music_publishing_registrations(track_id);
CREATE INDEX idx_music_pro_works_reg ON public.music_pro_works(registration_id);
