
CREATE TABLE public.music_mood_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mood TEXT,
  cover_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mmb_artist ON public.music_mood_boards(artist_id);
CREATE INDEX IF NOT EXISTS idx_mmb_published ON public.music_mood_boards(is_published);
ALTER TABLE public.music_mood_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mb public view published" ON public.music_mood_boards FOR SELECT USING (is_published = true OR auth.uid() = artist_id);
CREATE POLICY "mb artist insert" ON public.music_mood_boards FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "mb artist update" ON public.music_mood_boards FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "mb artist delete" ON public.music_mood_boards FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mmb_updated_at BEFORE UPDATE ON public.music_mood_boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_mood_board_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.music_mood_boards(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image','track','quote','link')),
  url TEXT,
  caption TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mmbi_board ON public.music_mood_board_items(board_id);
ALTER TABLE public.music_mood_board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mbi public view" ON public.music_mood_board_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.music_mood_boards b WHERE b.id = board_id AND (b.is_published = true OR b.artist_id = auth.uid())));
CREATE POLICY "mbi artist manage" ON public.music_mood_board_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.music_mood_boards b WHERE b.id = board_id AND b.artist_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.music_mood_boards b WHERE b.id = board_id AND b.artist_id = auth.uid()));
CREATE TRIGGER trg_mmbi_updated_at BEFORE UPDATE ON public.music_mood_board_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_mood_board_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.music_mood_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mmbl_board ON public.music_mood_board_likes(board_id);
ALTER TABLE public.music_mood_board_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mbl public view" ON public.music_mood_board_likes FOR SELECT USING (true);
CREATE POLICY "mbl user insert" ON public.music_mood_board_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mbl user delete" ON public.music_mood_board_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_mood_board_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_mood_boards SET like_count = like_count + 1 WHERE id = NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_mood_boards SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.board_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_mb_likes AFTER INSERT OR DELETE ON public.music_mood_board_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_mood_board_likes();
