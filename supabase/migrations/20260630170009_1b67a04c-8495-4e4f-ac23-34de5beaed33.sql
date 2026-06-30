
CREATE TABLE public.competition_entry_moderation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.music_challenge_entries(id) ON DELETE CASCADE,
  challenge_id UUID,
  moderator_id UUID,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.competition_entry_moderation_log TO authenticated;
GRANT ALL ON public.competition_entry_moderation_log TO service_role;

ALTER TABLE public.competition_entry_moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view moderation log"
  ON public.competition_entry_moderation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert moderation log"
  ON public.competition_entry_moderation_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_competition_mod_log_entry ON public.competition_entry_moderation_log(entry_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_competition_entry_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    INSERT INTO public.competition_entry_moderation_log
      (entry_id, challenge_id, moderator_id, previous_status, new_status, notes)
    VALUES
      (NEW.id, NEW.challenge_id, auth.uid(), OLD.moderation_status, NEW.moderation_status, NEW.moderation_notes);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_competition_entry_moderation ON public.music_challenge_entries;
CREATE TRIGGER trg_log_competition_entry_moderation
  AFTER UPDATE ON public.music_challenge_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_competition_entry_moderation();
