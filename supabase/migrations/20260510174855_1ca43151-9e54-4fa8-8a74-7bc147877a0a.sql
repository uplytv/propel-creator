
CREATE TABLE public.music_liner_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  track_title TEXT NOT NULL,
  album TEXT,
  body TEXT NOT NULL,
  story_type TEXT NOT NULL DEFAULT 'story' CHECK (story_type IN ('story','credits','recording','inspiration','lyric_meaning')),
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mln_artist ON public.music_liner_notes(artist_id);
ALTER TABLE public.music_liner_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ln public view" ON public.music_liner_notes FOR SELECT USING (true);
CREATE POLICY "ln artist insert" ON public.music_liner_notes FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "ln artist update" ON public.music_liner_notes FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "ln artist delete" ON public.music_liner_notes FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mln_updated_at BEFORE UPDATE ON public.music_liner_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_liner_note_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.music_liner_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(note_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mlnr_note ON public.music_liner_note_reactions(note_id);
ALTER TABLE public.music_liner_note_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lnr public view" ON public.music_liner_note_reactions FOR SELECT USING (true);
CREATE POLICY "lnr user insert" ON public.music_liner_note_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lnr user delete" ON public.music_liner_note_reactions FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_liner_note_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_liner_notes SET like_count = like_count + 1 WHERE id = NEW.note_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_liner_notes SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.note_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_sync_ln_likes AFTER INSERT OR DELETE ON public.music_liner_note_reactions
FOR EACH ROW EXECUTE FUNCTION public.sync_liner_note_likes();
