CREATE TABLE public.music_split_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  track_id UUID,
  song_title TEXT NOT NULL,
  work_title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_split_sheet_writers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID NOT NULL REFERENCES public.music_split_sheets(id) ON DELETE CASCADE,
  writer_user_id UUID,
  writer_name TEXT NOT NULL,
  writer_email TEXT,
  role TEXT NOT NULL DEFAULT 'writer',
  writing_share_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  publishing_share_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  pro_affiliation TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_split_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_split_sheet_writers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators and writers view sheets" ON public.music_split_sheets
  FOR SELECT USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.music_split_sheet_writers w
               WHERE w.sheet_id = id AND w.writer_user_id = auth.uid())
  );
CREATE POLICY "Creator manages sheet" ON public.music_split_sheets
  FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Writers and creator view writer rows" ON public.music_split_sheet_writers
  FOR SELECT USING (
    auth.uid() = writer_user_id
    OR EXISTS (SELECT 1 FROM public.music_split_sheets s
               WHERE s.id = sheet_id AND s.created_by = auth.uid())
  );
CREATE POLICY "Creator manages writer rows" ON public.music_split_sheet_writers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.music_split_sheets s
            WHERE s.id = sheet_id AND s.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.music_split_sheets s
            WHERE s.id = sheet_id AND s.created_by = auth.uid())
  );
CREATE POLICY "Writer can sign own row" ON public.music_split_sheet_writers
  FOR UPDATE USING (auth.uid() = writer_user_id) WITH CHECK (auth.uid() = writer_user_id);

CREATE INDEX idx_split_sheets_creator ON public.music_split_sheets(created_by);
CREATE INDEX idx_split_sheets_track ON public.music_split_sheets(track_id);
CREATE INDEX idx_split_writers_sheet ON public.music_split_sheet_writers(sheet_id);
CREATE INDEX idx_split_writers_user ON public.music_split_sheet_writers(writer_user_id);

CREATE TRIGGER update_music_split_sheets_updated_at
BEFORE UPDATE ON public.music_split_sheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();