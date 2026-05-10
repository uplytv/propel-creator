
CREATE TABLE public.music_tip_jar_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  target_cents INTEGER NOT NULL CHECK (target_cents > 0),
  raised_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','reached','closed')),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_tip_jar_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mtjg_public_view" ON public.music_tip_jar_goals FOR SELECT USING (true);
CREATE POLICY "mtjg_artist_insert" ON public.music_tip_jar_goals FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "mtjg_artist_update" ON public.music_tip_jar_goals FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "mtjg_artist_delete" ON public.music_tip_jar_goals FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mtjg_updated_at BEFORE UPDATE ON public.music_tip_jar_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_mtjg_artist ON public.music_tip_jar_goals(artist_id, status);

CREATE TABLE public.music_tip_jar_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.music_tip_jar_goals(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_tip_jar_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mtjc_public_view" ON public.music_tip_jar_contributions FOR SELECT USING (true);
CREATE POLICY "mtjc_fan_insert" ON public.music_tip_jar_contributions FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "mtjc_fan_delete" ON public.music_tip_jar_contributions FOR DELETE USING (auth.uid() = fan_id);
CREATE INDEX idx_mtjc_goal ON public.music_tip_jar_contributions(goal_id, created_at DESC);
CREATE INDEX idx_mtjc_fan ON public.music_tip_jar_contributions(fan_id);

CREATE OR REPLACE FUNCTION public.sync_tip_jar_goal_raised()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  gid UUID;
  total INTEGER;
  tgt INTEGER;
  st TEXT;
BEGIN
  gid := COALESCE(NEW.goal_id, OLD.goal_id);
  SELECT COALESCE(SUM(amount_cents), 0) INTO total
  FROM public.music_tip_jar_contributions WHERE goal_id = gid;
  SELECT target_cents, status INTO tgt, st FROM public.music_tip_jar_goals WHERE id = gid;
  UPDATE public.music_tip_jar_goals
  SET raised_cents = total,
      status = CASE
        WHEN st = 'closed' THEN 'closed'
        WHEN total >= tgt THEN 'reached'
        ELSE 'active'
      END
  WHERE id = gid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_mtjc_sync
  AFTER INSERT OR DELETE ON public.music_tip_jar_contributions
  FOR EACH ROW EXECUTE FUNCTION public.sync_tip_jar_goal_raised();
