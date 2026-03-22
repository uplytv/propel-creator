-- Add visibility and scheduled_publish_at to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

-- Create index for scheduled publishing
CREATE INDEX IF NOT EXISTS idx_videos_scheduled_publish ON public.videos (scheduled_publish_at) WHERE scheduled_publish_at IS NOT NULL AND visibility = 'private';