
CREATE TABLE public.music_sync_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  track_id uuid,
  title text NOT NULL,
  artist_name text NOT NULL,
  description text,
  mood text[],
  genre text[],
  tags text[],
  min_fee_cents integer,
  max_fee_cents integer,
  exclusive boolean NOT NULL DEFAULT false,
  preview_url text,
  artwork_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.music_sync_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view active sync listings" ON public.music_sync_listings FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);
CREATE POLICY "owners manage sync listings" ON public.music_sync_listings FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.music_sync_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_name text NOT NULL,
  project_type text NOT NULL,
  description text,
  reference_url text,
  mood text[],
  genre text[],
  budget_cents integer,
  deadline date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.music_sync_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view open briefs" ON public.music_sync_briefs FOR SELECT USING (status = 'open' OR auth.uid() = owner_id);
CREATE POLICY "owners manage briefs" ON public.music_sync_briefs FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.music_sync_pitches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.music_sync_briefs(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.music_sync_listings(id) ON DELETE SET NULL,
  pitcher_id uuid NOT NULL,
  message text,
  proposed_fee_cents integer,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brief_id, listing_id, pitcher_id)
);
ALTER TABLE public.music_sync_pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pitcher manages pitches" ON public.music_sync_pitches FOR ALL USING (auth.uid() = pitcher_id) WITH CHECK (auth.uid() = pitcher_id);
CREATE POLICY "brief owner views pitches" ON public.music_sync_pitches FOR SELECT USING (
  auth.uid() = pitcher_id OR EXISTS (SELECT 1 FROM public.music_sync_briefs b WHERE b.id = brief_id AND b.owner_id = auth.uid())
);
CREATE POLICY "brief owner updates pitch status" ON public.music_sync_pitches FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.music_sync_briefs b WHERE b.id = brief_id AND b.owner_id = auth.uid())
);

CREATE TRIGGER trg_sync_listings_updated BEFORE UPDATE ON public.music_sync_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sync_briefs_updated BEFORE UPDATE ON public.music_sync_briefs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sync_pitches_updated BEFORE UPDATE ON public.music_sync_pitches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sync_listings_owner ON public.music_sync_listings(owner_id);
CREATE INDEX idx_sync_briefs_owner ON public.music_sync_briefs(owner_id);
CREATE INDEX idx_sync_pitches_brief ON public.music_sync_pitches(brief_id);
CREATE INDEX idx_sync_pitches_pitcher ON public.music_sync_pitches(pitcher_id);
