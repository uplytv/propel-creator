
CREATE TABLE IF NOT EXISTS public.music_tip_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  goal_cents integer NOT NULL CHECK (goal_cents > 0),
  raised_cents integer NOT NULL DEFAULT 0,
  contributor_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','reached','closed')),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mtg_artist ON public.music_tip_goals(artist_id);
CREATE INDEX IF NOT EXISTS idx_mtg_status ON public.music_tip_goals(status);

ALTER TABLE public.music_tip_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view non-draft goals" ON public.music_tip_goals;
CREATE POLICY "Public view non-draft goals" ON public.music_tip_goals
  FOR SELECT USING (status <> 'draft');

DROP POLICY IF EXISTS "Artists manage own goals" ON public.music_tip_goals;
CREATE POLICY "Artists manage own goals" ON public.music_tip_goals
  FOR ALL USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);

CREATE TABLE IF NOT EXISTS public.music_tip_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.music_tip_goals(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  message text,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mtc_goal ON public.music_tip_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_mtc_fan ON public.music_tip_contributions(fan_id);

ALTER TABLE public.music_tip_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view contributions" ON public.music_tip_contributions;
CREATE POLICY "Public view contributions" ON public.music_tip_contributions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Fans insert own contributions" ON public.music_tip_contributions;
CREATE POLICY "Fans insert own contributions" ON public.music_tip_contributions
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

DROP POLICY IF EXISTS "Fans delete own contributions" ON public.music_tip_contributions;
CREATE POLICY "Fans delete own contributions" ON public.music_tip_contributions
  FOR DELETE USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_tip_goal_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_tip_goals
      SET raised_cents = raised_cents + NEW.amount_cents,
          contributor_count = contributor_count + 1,
          updated_at = now()
      WHERE id = NEW.goal_id
      RETURNING * INTO g;
    IF FOUND AND g.raised_cents >= g.goal_cents AND g.status = 'active' THEN
      UPDATE public.music_tip_goals SET status = 'reached' WHERE id = g.id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_tip_goals
      SET raised_cents = GREATEST(0, raised_cents - OLD.amount_cents),
          contributor_count = GREATEST(0, contributor_count - 1),
          updated_at = now()
      WHERE id = OLD.goal_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_mtc_sync ON public.music_tip_contributions;
CREATE TRIGGER trg_mtc_sync
AFTER INSERT OR DELETE ON public.music_tip_contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_tip_goal_totals();

CREATE OR REPLACE FUNCTION public.update_mtg_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_mtg_updated_at ON public.music_tip_goals;
CREATE TRIGGER trg_mtg_updated_at
BEFORE UPDATE ON public.music_tip_goals
FOR EACH ROW EXECUTE FUNCTION public.update_mtg_updated_at();
