CREATE TABLE IF NOT EXISTS public.music_concert_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concert_id UUID NOT NULL REFERENCES public.music_concerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','interested','not_going')),
  remind_me BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(concert_id, user_id)
);

ALTER TABLE public.music_concert_rsvps ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mcr_concert ON public.music_concert_rsvps(concert_id);
CREATE INDEX IF NOT EXISTS idx_mcr_user ON public.music_concert_rsvps(user_id);

DO $$ BEGIN
  CREATE POLICY "mcr_select_own_or_artist" ON public.music_concert_rsvps FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.music_concerts mc
      JOIN public.artist_profiles ap ON ap.id = mc.artist_id
      WHERE mc.id = concert_id AND ap.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mcr_insert_own" ON public.music_concert_rsvps FOR INSERT
  WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mcr_update_own" ON public.music_concert_rsvps FOR UPDATE
  USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mcr_delete_own" ON public.music_concert_rsvps FOR DELETE
  USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_mcr_updated_at BEFORE UPDATE ON public.music_concert_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;