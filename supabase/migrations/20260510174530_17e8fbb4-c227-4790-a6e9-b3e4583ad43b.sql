
CREATE TABLE public.music_presave_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  release_title TEXT NOT NULL,
  artwork_url TEXT,
  release_date DATE NOT NULL,
  spotify_url TEXT,
  apple_url TEXT,
  tidal_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','canceled')),
  presave_count INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_presave_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpc_public_view" ON public.music_presave_campaigns FOR SELECT USING (true);
CREATE POLICY "mpc_artist_insert" ON public.music_presave_campaigns FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "mpc_artist_update" ON public.music_presave_campaigns FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "mpc_artist_delete" ON public.music_presave_campaigns FOR DELETE USING (auth.uid() = artist_id);
CREATE TRIGGER trg_mpc_updated_at BEFORE UPDATE ON public.music_presave_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_music_presave_campaigns_artist ON public.music_presave_campaigns(artist_id, status);
CREATE INDEX IF NOT EXISTS idx_music_presave_campaigns_release ON public.music_presave_campaigns(release_date);

CREATE TABLE public.music_presave_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.music_presave_campaigns(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL,
  email TEXT,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, fan_id)
);
ALTER TABLE public.music_presave_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mps_fan_view_own" ON public.music_presave_signups FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "mps_artist_view" ON public.music_presave_signups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.music_presave_campaigns c WHERE c.id = campaign_id AND c.artist_id = auth.uid())
);
CREATE POLICY "mps_fan_insert" ON public.music_presave_signups FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "mps_fan_update" ON public.music_presave_signups FOR UPDATE USING (auth.uid() = fan_id);
CREATE POLICY "mps_fan_delete" ON public.music_presave_signups FOR DELETE USING (auth.uid() = fan_id);
CREATE INDEX IF NOT EXISTS idx_music_presave_signups_campaign ON public.music_presave_signups(campaign_id);
CREATE INDEX IF NOT EXISTS idx_music_presave_signups_fan ON public.music_presave_signups(fan_id);

CREATE OR REPLACE FUNCTION public.sync_presave_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID;
BEGIN
  cid := COALESCE(NEW.campaign_id, OLD.campaign_id);
  UPDATE public.music_presave_campaigns
  SET presave_count = (SELECT COUNT(*) FROM public.music_presave_signups WHERE campaign_id = cid)
  WHERE id = cid;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_mps_sync
  AFTER INSERT OR DELETE ON public.music_presave_signups
  FOR EACH ROW EXECUTE FUNCTION public.sync_presave_count();
