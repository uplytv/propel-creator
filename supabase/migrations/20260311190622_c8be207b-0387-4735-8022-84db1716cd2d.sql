
-- affiliate_links: platform referral links
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0,
  revenue_generated NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own affiliate links" ON public.affiliate_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own affiliate links" ON public.affiliate_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own affiliate links" ON public.affiliate_links FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all affiliate links" ON public.affiliate_links FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role full access affiliate links" ON public.affiliate_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- affiliate_conversions
CREATE TABLE public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code TEXT NOT NULL,
  referred_user_id UUID NOT NULL,
  referring_user_id UUID NOT NULL,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('signup', 'purchase')),
  amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversions as referrer" ON public.affiliate_conversions FOR SELECT TO authenticated USING (auth.uid() = referring_user_id);
CREATE POLICY "Admins can view all conversions" ON public.affiliate_conversions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update conversions" ON public.affiliate_conversions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role full access conversions" ON public.affiliate_conversions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- creator_affiliate_programs
CREATE TABLE public.creator_affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 20,
  cookie_duration_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_affiliate_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active programs" ON public.creator_affiliate_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can manage own program" ON public.creator_affiliate_programs FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- creator_affiliate_members
CREATE TABLE public.creator_affiliate_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.creator_affiliate_programs(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  affiliate_code TEXT NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  earnings NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_affiliate_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own affiliate data" ON public.creator_affiliate_members FOR SELECT TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Creators can view their program members" ON public.creator_affiliate_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.creator_affiliate_programs p WHERE p.id = creator_affiliate_members.program_id AND p.creator_id = auth.uid())
);
CREATE POLICY "Service role full access creator affiliate members" ON public.creator_affiliate_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime for conversions
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_conversions;
