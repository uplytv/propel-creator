ALTER TABLE public.uply_channels ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_uply_channels_is_active ON public.uply_channels(is_active);