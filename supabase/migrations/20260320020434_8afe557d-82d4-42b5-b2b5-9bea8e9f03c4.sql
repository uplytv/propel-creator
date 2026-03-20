
ALTER TABLE public.classroom_lessons 
  ADD COLUMN IF NOT EXISTS video_type text DEFAULT 'mux',
  ADD COLUMN IF NOT EXISTS youtube_video_id text;
