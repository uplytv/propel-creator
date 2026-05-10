
CREATE TABLE public.music_lyric_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  track_title TEXT NOT NULL,
  artist_label TEXT,
  lyrics_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  annotation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_lyric_sheets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lyric_sheets_artist ON public.music_lyric_sheets(artist_id);
CREATE INDEX IF NOT EXISTS idx_lyric_sheets_status ON public.music_lyric_sheets(status);
CREATE TRIGGER trg_lyric_sheets_updated_at BEFORE UPDATE ON public.music_lyric_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "View published lyric sheets" ON public.music_lyric_sheets
  FOR SELECT USING (status = 'published' OR auth.uid() = artist_id);
CREATE POLICY "Artist manage lyric sheets" ON public.music_lyric_sheets
  FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

CREATE TABLE public.music_lyric_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID NOT NULL REFERENCES public.music_lyric_sheets(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  line_text TEXT NOT NULL,
  annotation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_lyric_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lyric_lines_sheet ON public.music_lyric_lines(sheet_id);
CREATE TRIGGER trg_lyric_lines_updated_at BEFORE UPDATE ON public.music_lyric_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "View lyric lines" ON public.music_lyric_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.music_lyric_sheets s
    WHERE s.id = sheet_id AND (s.status = 'published' OR s.artist_id = auth.uid())
  ));
CREATE POLICY "Artist manage lyric lines" ON public.music_lyric_lines
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.music_lyric_sheets s WHERE s.id = sheet_id AND s.artist_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.music_lyric_sheets s WHERE s.id = sheet_id AND s.artist_id = auth.uid()
  ));

CREATE TABLE public.music_lyric_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id UUID NOT NULL REFERENCES public.music_lyric_lines(id) ON DELETE CASCADE,
  sheet_id UUID NOT NULL REFERENCES public.music_lyric_sheets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_lyric_annotations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lyric_annotations_line ON public.music_lyric_annotations(line_id);
CREATE INDEX IF NOT EXISTS idx_lyric_annotations_author ON public.music_lyric_annotations(author_id);
CREATE TRIGGER trg_lyric_annotations_updated_at BEFORE UPDATE ON public.music_lyric_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "View visible annotations" ON public.music_lyric_annotations
  FOR SELECT USING (
    status = 'visible' OR auth.uid() = author_id OR EXISTS (
      SELECT 1 FROM public.music_lyric_sheets s WHERE s.id = sheet_id AND s.artist_id = auth.uid()
    )
  );
CREATE POLICY "Authors create annotations" ON public.music_lyric_annotations
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own annotations" ON public.music_lyric_annotations
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors or artist delete annotations" ON public.music_lyric_annotations
  FOR DELETE USING (
    auth.uid() = author_id OR EXISTS (
      SELECT 1 FROM public.music_lyric_sheets s WHERE s.id = sheet_id AND s.artist_id = auth.uid()
    )
  );

CREATE TABLE public.music_lyric_annotation_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annotation_id UUID NOT NULL REFERENCES public.music_lyric_annotations(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(annotation_id, voter_id)
);
ALTER TABLE public.music_lyric_annotation_votes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lyric_ann_votes_annotation ON public.music_lyric_annotation_votes(annotation_id);
CREATE INDEX IF NOT EXISTS idx_lyric_ann_votes_voter ON public.music_lyric_annotation_votes(voter_id);

CREATE POLICY "View annotation votes" ON public.music_lyric_annotation_votes
  FOR SELECT USING (true);
CREATE POLICY "Cast annotation vote" ON public.music_lyric_annotation_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "Remove own annotation vote" ON public.music_lyric_annotation_votes
  FOR DELETE USING (auth.uid() = voter_id);

CREATE OR REPLACE FUNCTION public.sync_lyric_annotation_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_lyric_lines SET annotation_count = annotation_count + 1 WHERE id = NEW.line_id;
    UPDATE public.music_lyric_sheets SET annotation_count = annotation_count + 1 WHERE id = NEW.sheet_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_lyric_lines SET annotation_count = GREATEST(annotation_count - 1, 0) WHERE id = OLD.line_id;
    UPDATE public.music_lyric_sheets SET annotation_count = GREATEST(annotation_count - 1, 0) WHERE id = OLD.sheet_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_lyric_annotations
  AFTER INSERT OR DELETE ON public.music_lyric_annotations
  FOR EACH ROW EXECUTE FUNCTION public.sync_lyric_annotation_counts();

CREATE OR REPLACE FUNCTION public.sync_lyric_annotation_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_lyric_annotations SET upvote_count = upvote_count + 1 WHERE id = NEW.annotation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_lyric_annotations SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.annotation_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_lyric_annotation_votes
  AFTER INSERT OR DELETE ON public.music_lyric_annotation_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_lyric_annotation_votes();
