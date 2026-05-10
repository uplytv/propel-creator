CREATE TABLE public.music_setlist_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  title TEXT NOT NULL,
  show_date DATE,
  option_a_label TEXT NOT NULL,
  option_b_label TEXT NOT NULL,
  option_a_tracks TEXT[] NOT NULL DEFAULT '{}',
  option_b_tracks TEXT[] NOT NULL DEFAULT '{}',
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','revealed')),
  winner TEXT CHECK (winner IN ('a','b','tie')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msb_artist ON public.music_setlist_battles(artist_id, created_at DESC);

ALTER TABLE public.music_setlist_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battles are viewable by everyone"
  ON public.music_setlist_battles FOR SELECT USING (true);
CREATE POLICY "Artists create own battles"
  ON public.music_setlist_battles FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists update own battles"
  ON public.music_setlist_battles FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artists delete own battles"
  ON public.music_setlist_battles FOR DELETE USING (auth.uid() = artist_id);

CREATE TRIGGER trg_msb_updated_at
  BEFORE UPDATE ON public.music_setlist_battles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_setlist_battle_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.music_setlist_battles(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('a','b')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (battle_id, fan_id)
);

CREATE INDEX idx_msbv_battle ON public.music_setlist_battle_votes(battle_id);

ALTER TABLE public.music_setlist_battle_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are viewable by everyone"
  ON public.music_setlist_battle_votes FOR SELECT USING (true);
CREATE POLICY "Fans cast own vote"
  ON public.music_setlist_battle_votes FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans update own vote"
  ON public.music_setlist_battle_votes FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "Fans delete own vote"
  ON public.music_setlist_battle_votes FOR DELETE USING (auth.uid() = fan_id);

CREATE OR REPLACE FUNCTION public.sync_setlist_battle_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.choice = 'a' THEN
      UPDATE public.music_setlist_battles SET votes_a = votes_a + 1 WHERE id = NEW.battle_id;
    ELSE
      UPDATE public.music_setlist_battles SET votes_b = votes_b + 1 WHERE id = NEW.battle_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.choice <> NEW.choice THEN
    IF NEW.choice = 'a' THEN
      UPDATE public.music_setlist_battles SET votes_a = votes_a + 1, votes_b = GREATEST(votes_b - 1, 0) WHERE id = NEW.battle_id;
    ELSE
      UPDATE public.music_setlist_battles SET votes_b = votes_b + 1, votes_a = GREATEST(votes_a - 1, 0) WHERE id = NEW.battle_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.choice = 'a' THEN
      UPDATE public.music_setlist_battles SET votes_a = GREATEST(votes_a - 1, 0) WHERE id = OLD.battle_id;
    ELSE
      UPDATE public.music_setlist_battles SET votes_b = GREATEST(votes_b - 1, 0) WHERE id = OLD.battle_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_msbv_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.music_setlist_battle_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_setlist_battle_votes();