-- Streaks
CREATE TABLE IF NOT EXISTS public.music_listen_streaks (
  user_id UUID NOT NULL PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_listened_on DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_listen_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Streaks: own read" ON public.music_listen_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Streaks: public read leaderboard" ON public.music_listen_streaks FOR SELECT USING (true);

-- Catalog of badges
CREATE TABLE IF NOT EXISTS public.music_badges (
  key TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges: public read" ON public.music_badges FOR SELECT USING (true);

-- Seed catalog
INSERT INTO public.music_badges (key, title, description, icon, tier) VALUES
  ('first_listen', 'First Listen', 'Played your first track', 'play', 'bronze'),
  ('streak_7', '7-Day Streak', 'Listened 7 days in a row', 'flame', 'silver'),
  ('streak_30', '30-Day Streak', 'Listened 30 days in a row', 'flame', 'gold'),
  ('streak_100', 'Century Listener', 'Listened 100 days in a row', 'crown', 'platinum'),
  ('first_tip', 'Generous Soul', 'Tipped your first artist', 'heart', 'bronze'),
  ('superfan', 'Superfan', 'Top 10 fan of an artist', 'star', 'gold')
ON CONFLICT (key) DO NOTHING;

-- User badges
CREATE TABLE IF NOT EXISTS public.music_user_badges (
  user_id UUID NOT NULL,
  badge_key TEXT NOT NULL REFERENCES public.music_badges(key) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_key)
);
ALTER TABLE public.music_user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "UserBadges: public read" ON public.music_user_badges FOR SELECT USING (true);

-- RPC: record a daily listen, update streak, optionally award badges
CREATE OR REPLACE FUNCTION public.record_music_listen_day()
RETURNS public.music_listen_streaks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  today DATE := (now() AT TIME ZONE 'utc')::date;
  existing public.music_listen_streaks%ROWTYPE;
  result public.music_listen_streaks%ROWTYPE;
  new_current INTEGER;
  new_longest INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO existing FROM public.music_listen_streaks WHERE user_id = uid;

  IF NOT FOUND THEN
    INSERT INTO public.music_listen_streaks (user_id, current_streak, longest_streak, last_listened_on)
    VALUES (uid, 1, 1, today)
    RETURNING * INTO result;
    INSERT INTO public.music_user_badges (user_id, badge_key)
      VALUES (uid, 'first_listen') ON CONFLICT DO NOTHING;
    RETURN result;
  END IF;

  IF existing.last_listened_on = today THEN
    RETURN existing;
  ELSIF existing.last_listened_on = today - 1 THEN
    new_current := existing.current_streak + 1;
  ELSE
    new_current := 1;
  END IF;

  new_longest := GREATEST(existing.longest_streak, new_current);

  UPDATE public.music_listen_streaks
    SET current_streak = new_current,
        longest_streak = new_longest,
        last_listened_on = today,
        updated_at = now()
    WHERE user_id = uid
    RETURNING * INTO result;

  -- Award streak badges
  IF new_current >= 7 THEN
    INSERT INTO public.music_user_badges (user_id, badge_key) VALUES (uid, 'streak_7') ON CONFLICT DO NOTHING;
  END IF;
  IF new_current >= 30 THEN
    INSERT INTO public.music_user_badges (user_id, badge_key) VALUES (uid, 'streak_30') ON CONFLICT DO NOTHING;
  END IF;
  IF new_current >= 100 THEN
    INSERT INTO public.music_user_badges (user_id, badge_key) VALUES (uid, 'streak_100') ON CONFLICT DO NOTHING;
  END IF;

  RETURN result;
END;
$$;

-- Global streak leaderboard
CREATE OR REPLACE FUNCTION public.music_streak_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(user_id UUID, current_streak INTEGER, longest_streak INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, current_streak, longest_streak
  FROM public.music_listen_streaks
  WHERE current_streak > 0
  ORDER BY current_streak DESC, longest_streak DESC
  LIMIT p_limit;
$$;