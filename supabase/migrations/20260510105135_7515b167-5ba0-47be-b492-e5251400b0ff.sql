
CREATE TABLE public.music_crowdfund_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  kind TEXT NOT NULL DEFAULT 'album',
  goal_cents INTEGER NOT NULL DEFAULT 0,
  raised_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfund_campaigns_creator ON public.music_crowdfund_campaigns(creator_id);
CREATE INDEX idx_cfund_campaigns_status ON public.music_crowdfund_campaigns(status);

ALTER TABLE public.music_crowdfund_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view live campaigns" ON public.music_crowdfund_campaigns
FOR SELECT USING (status IN ('live','successful','ended'));
CREATE POLICY "Creators view own campaigns" ON public.music_crowdfund_campaigns
FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators insert campaigns" ON public.music_crowdfund_campaigns
FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update campaigns" ON public.music_crowdfund_campaigns
FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators delete campaigns" ON public.music_crowdfund_campaigns
FOR DELETE USING (auth.uid() = creator_id);

CREATE TRIGGER update_cfund_campaigns_updated_at
BEFORE UPDATE ON public.music_crowdfund_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.music_crowdfund_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.music_crowdfund_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pledge_cents INTEGER NOT NULL DEFAULT 0,
  perks TEXT,
  limit_count INTEGER,
  claimed_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfund_tiers_campaign ON public.music_crowdfund_tiers(campaign_id);

ALTER TABLE public.music_crowdfund_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view tiers of live campaigns" ON public.music_crowdfund_tiers
FOR SELECT USING (EXISTS (SELECT 1 FROM public.music_crowdfund_campaigns c WHERE c.id = campaign_id AND c.status IN ('live','successful','ended')));
CREATE POLICY "Creators manage own tiers" ON public.music_crowdfund_tiers
FOR ALL USING (EXISTS (SELECT 1 FROM public.music_crowdfund_campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.music_crowdfund_campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid()));

CREATE TABLE public.music_crowdfund_pledges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.music_crowdfund_campaigns(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.music_crowdfund_tiers(id) ON DELETE SET NULL,
  backer_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pledged',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfund_pledges_campaign ON public.music_crowdfund_pledges(campaign_id);
CREATE INDEX idx_cfund_pledges_backer ON public.music_crowdfund_pledges(backer_id);

ALTER TABLE public.music_crowdfund_pledges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backers view own pledges" ON public.music_crowdfund_pledges
FOR SELECT USING (auth.uid() = backer_id);
CREATE POLICY "Creators view pledges to their campaigns" ON public.music_crowdfund_pledges
FOR SELECT USING (EXISTS (SELECT 1 FROM public.music_crowdfund_campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid()));
CREATE POLICY "Authenticated users can pledge" ON public.music_crowdfund_pledges
FOR INSERT WITH CHECK (auth.uid() = backer_id);
