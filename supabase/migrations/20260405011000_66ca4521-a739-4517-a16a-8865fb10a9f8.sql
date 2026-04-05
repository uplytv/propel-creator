
-- Add like_count to clips first
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0;

-- Add columns to stream_recordings
ALTER TABLE public.stream_recordings ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.stream_recordings ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0;

-- CLIPS: triggers to maintain clips.like_count
CREATE OR REPLACE FUNCTION public.increment_clip_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN UPDATE public.clips SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.clip_id; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.decrement_clip_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN UPDATE public.clips SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) WHERE id = OLD.clip_id; RETURN OLD; END; $$;

DROP TRIGGER IF EXISTS trg_increment_clip_likes ON public.clip_likes;
CREATE TRIGGER trg_increment_clip_likes AFTER INSERT ON public.clip_likes FOR EACH ROW EXECUTE FUNCTION public.increment_clip_like_count();

DROP TRIGGER IF EXISTS trg_decrement_clip_likes ON public.clip_likes;
CREATE TRIGGER trg_decrement_clip_likes AFTER DELETE ON public.clip_likes FOR EACH ROW EXECUTE FUNCTION public.decrement_clip_like_count();

-- Backfill clips.like_count
UPDATE public.clips c SET like_count = (SELECT COUNT(*) FROM public.clip_likes cl WHERE cl.clip_id = c.id);

-- Create recording_likes table
CREATE TABLE IF NOT EXISTS public.recording_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES public.stream_recordings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recording_id, user_id)
);
ALTER TABLE public.recording_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view recording likes" ON public.recording_likes FOR SELECT USING (true);
CREATE POLICY "Users can like recordings" ON public.recording_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unlike recordings" ON public.recording_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Recording like_count triggers
CREATE OR REPLACE FUNCTION public.increment_recording_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN UPDATE public.stream_recordings SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.recording_id; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.decrement_recording_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN UPDATE public.stream_recordings SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) WHERE id = OLD.recording_id; RETURN OLD; END; $$;

CREATE TRIGGER trg_increment_recording_likes AFTER INSERT ON public.recording_likes FOR EACH ROW EXECUTE FUNCTION public.increment_recording_like_count();
CREATE TRIGGER trg_decrement_recording_likes AFTER DELETE ON public.recording_likes FOR EACH ROW EXECUTE FUNCTION public.decrement_recording_like_count();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_likes;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_videos_algorithm ON public.videos (is_public, created_at DESC, trending_score DESC NULLS LAST) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_recordings_algorithm ON public.stream_recordings (is_published, created_at DESC, trending_score DESC NULLS LAST) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_clips_algorithm ON public.clips (is_public, created_at DESC, trending_score DESC NULLS LAST) WHERE is_public = true;
