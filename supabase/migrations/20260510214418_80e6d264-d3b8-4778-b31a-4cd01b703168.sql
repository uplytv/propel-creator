
CREATE TABLE public.music_voice_memos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INT,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  like_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_voice_memos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mvm_artist ON public.music_voice_memos(artist_id);
CREATE INDEX idx_mvm_status ON public.music_voice_memos(status);
CREATE TRIGGER trg_mvm_updated_at BEFORE UPDATE ON public.music_voice_memos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "voice memos public view published" ON public.music_voice_memos
  FOR SELECT USING (status = 'published' OR auth.uid() = artist_id);
CREATE POLICY "voice memos artist insert" ON public.music_voice_memos
  FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "voice memos artist update" ON public.music_voice_memos
  FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "voice memos artist delete" ON public.music_voice_memos
  FOR DELETE USING (auth.uid() = artist_id);

CREATE TABLE public.music_voice_memo_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memo_id UUID NOT NULL REFERENCES public.music_voice_memos(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (memo_id, fan_id)
);
ALTER TABLE public.music_voice_memo_likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mvml_memo ON public.music_voice_memo_likes(memo_id);
CREATE INDEX idx_mvml_fan ON public.music_voice_memo_likes(fan_id);

CREATE POLICY "voice memo likes public view" ON public.music_voice_memo_likes
  FOR SELECT USING (true);
CREATE POLICY "voice memo likes self insert" ON public.music_voice_memo_likes
  FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "voice memo likes self delete" ON public.music_voice_memo_likes
  FOR DELETE USING (auth.uid() = fan_id);

CREATE TABLE public.music_voice_memo_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memo_id UUID NOT NULL REFERENCES public.music_voice_memos(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_voice_memo_replies ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mvmr_memo ON public.music_voice_memo_replies(memo_id);
CREATE INDEX idx_mvmr_fan ON public.music_voice_memo_replies(fan_id);
CREATE TRIGGER trg_mvmr_updated_at BEFORE UPDATE ON public.music_voice_memo_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "voice memo replies public view visible" ON public.music_voice_memo_replies
  FOR SELECT USING (
    status = 'visible'
    OR auth.uid() = fan_id
    OR EXISTS (SELECT 1 FROM public.music_voice_memos m WHERE m.id = memo_id AND m.artist_id = auth.uid())
  );
CREATE POLICY "voice memo replies fan insert" ON public.music_voice_memo_replies
  FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "voice memo replies fan or artist update" ON public.music_voice_memo_replies
  FOR UPDATE USING (
    auth.uid() = fan_id
    OR EXISTS (SELECT 1 FROM public.music_voice_memos m WHERE m.id = memo_id AND m.artist_id = auth.uid())
  );
CREATE POLICY "voice memo replies fan or artist delete" ON public.music_voice_memo_replies
  FOR DELETE USING (
    auth.uid() = fan_id
    OR EXISTS (SELECT 1 FROM public.music_voice_memos m WHERE m.id = memo_id AND m.artist_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.sync_voice_memo_likes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_voice_memos SET like_count = like_count + 1 WHERE id = NEW.memo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_voice_memos SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.memo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_voice_memo_likes
AFTER INSERT OR DELETE ON public.music_voice_memo_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_voice_memo_likes();

CREATE OR REPLACE FUNCTION public.sync_voice_memo_replies()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_voice_memos SET reply_count = reply_count + 1 WHERE id = NEW.memo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_voice_memos SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.memo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_voice_memo_replies
AFTER INSERT OR DELETE ON public.music_voice_memo_replies
FOR EACH ROW EXECUTE FUNCTION public.sync_voice_memo_replies();
