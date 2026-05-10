
CREATE TABLE public.music_fan_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price_cents INTEGER NOT NULL DEFAULT 500,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  artwork_url TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_fan_club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.music_fan_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  tier TEXT NOT NULL DEFAULT 'standard',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

CREATE TABLE public.music_fan_club_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.music_fan_clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'audio',
  media_url TEXT,
  artwork_url TEXT,
  unlock_tier TEXT NOT NULL DEFAULT 'standard',
  drops_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.music_fan_club_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.music_fan_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  milestone TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id, badge_type)
);

CREATE INDEX idx_music_fan_clubs_artist ON public.music_fan_clubs(artist_id);
CREATE INDEX idx_music_fan_club_memberships_user ON public.music_fan_club_memberships(user_id);
CREATE INDEX idx_music_fan_club_memberships_club ON public.music_fan_club_memberships(club_id, status);
CREATE INDEX idx_music_fan_club_drops_club ON public.music_fan_club_drops(club_id, drops_at DESC);
CREATE INDEX idx_music_fan_club_badges_user ON public.music_fan_club_badges(user_id);

ALTER TABLE public.music_fan_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_fan_club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_fan_club_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_fan_club_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active fan clubs are public"
  ON public.music_fan_clubs FOR SELECT USING (is_active = true OR auth.uid() = artist_id);

CREATE POLICY "Artists manage their fan clubs"
  ON public.music_fan_clubs FOR ALL
  USING (auth.uid() = artist_id)
  WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Users view own memberships"
  ON public.music_fan_club_memberships FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.music_fan_clubs c WHERE c.id = club_id AND c.artist_id = auth.uid()));

CREATE POLICY "Users insert own memberships"
  ON public.music_fan_club_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own memberships"
  ON public.music_fan_club_memberships FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Active members view drops"
  ON public.music_fan_club_drops FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.music_fan_clubs c WHERE c.id = club_id AND c.artist_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.music_fan_club_memberships m WHERE m.club_id = music_fan_club_drops.club_id AND m.user_id = auth.uid() AND m.status = 'active')
  );

CREATE POLICY "Artists manage drops"
  ON public.music_fan_club_drops FOR ALL
  USING (EXISTS (SELECT 1 FROM public.music_fan_clubs c WHERE c.id = club_id AND c.artist_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.music_fan_clubs c WHERE c.id = club_id AND c.artist_id = auth.uid()));

CREATE POLICY "Members and artists view badges"
  ON public.music_fan_club_badges FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.music_fan_clubs c WHERE c.id = club_id AND c.artist_id = auth.uid())
  );

CREATE POLICY "Artists award badges"
  ON public.music_fan_club_badges FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.music_fan_clubs c WHERE c.id = club_id AND c.artist_id = auth.uid()));

CREATE TRIGGER update_music_fan_clubs_updated_at
  BEFORE UPDATE ON public.music_fan_clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_music_fan_club_memberships_updated_at
  BEFORE UPDATE ON public.music_fan_club_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_fan_club_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.music_fan_clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status = 'active' THEN
      UPDATE public.music_fan_clubs SET member_count = member_count + 1 WHERE id = NEW.club_id;
    ELSIF OLD.status = 'active' THEN
      UPDATE public.music_fan_clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = NEW.club_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.music_fan_clubs SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.club_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_fan_club_member_count
  AFTER INSERT OR UPDATE OR DELETE ON public.music_fan_club_memberships
  FOR EACH ROW EXECUTE FUNCTION public.sync_fan_club_member_count();
