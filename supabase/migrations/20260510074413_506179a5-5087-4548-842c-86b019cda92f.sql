ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS has_spatial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_lossless BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hires_url TEXT,
  ADD COLUMN IF NOT EXISTS spatial_url TEXT;

CREATE TABLE IF NOT EXISTS public.music_audio_preferences (
  user_id UUID PRIMARY KEY,
  spatial_enabled BOOLEAN NOT NULL DEFAULT true,
  lossless_enabled BOOLEAN NOT NULL DEFAULT false,
  prefer_on_wifi_only BOOLEAN NOT NULL DEFAULT true,
  normalize_volume BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.music_audio_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own audio prefs"
  ON public.music_audio_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own audio prefs"
  ON public.music_audio_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own audio prefs"
  ON public.music_audio_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_audio_prefs_updated
  BEFORE UPDATE ON public.music_audio_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();