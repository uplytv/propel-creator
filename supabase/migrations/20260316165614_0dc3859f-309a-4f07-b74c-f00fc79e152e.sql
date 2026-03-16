
-- Add stripe_payment_intent_id to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Creator Stripe Accounts
CREATE TABLE public.creator_stripe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  stripe_account_id text NOT NULL,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.creator_stripe_accounts ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_creator_stripe_accounts_creator ON public.creator_stripe_accounts(creator_id);
CREATE POLICY "Creators can view own stripe account" ON public.creator_stripe_accounts FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Service role full access stripe accounts" ON public.creator_stripe_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Subscription Tiers
CREATE TABLE public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_monthly numeric NOT NULL DEFAULT 0,
  stripe_price_id text,
  stripe_product_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active tiers" ON public.subscription_tiers FOR SELECT USING (true);
CREATE POLICY "Creators manage own tiers" ON public.subscription_tiers FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Service role full access tiers" ON public.subscription_tiers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Member Subscriptions
CREATE TABLE public.member_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  tier_id uuid REFERENCES public.subscription_tiers(id),
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own subscriptions" ON public.member_subscriptions FOR SELECT TO authenticated USING (auth.uid() = member_id);
CREATE POLICY "Creators can view subs to them" ON public.member_subscriptions FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Service role full access subs" ON public.member_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clips
CREATE TABLE public.clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'live',
  source_asset_id text,
  clip_asset_id text,
  clip_playback_id text,
  creator_id uuid NOT NULL,
  clipped_by_user_id uuid NOT NULL,
  caption text NOT NULL DEFAULT '',
  duration_seconds integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public clips" ON public.clips FOR SELECT USING (is_public = true);
CREATE POLICY "Creators can view own clips" ON public.clips FOR SELECT TO authenticated USING (auth.uid() = creator_id OR auth.uid() = clipped_by_user_id);
CREATE POLICY "Users can create clips" ON public.clips FOR INSERT TO authenticated WITH CHECK (auth.uid() = clipped_by_user_id);
CREATE POLICY "Creators can manage own clips" ON public.clips FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Service role full access clips" ON public.clips FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Shorts
CREATE TABLE public.shorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  mux_asset_id text,
  playback_id text,
  caption text NOT NULL DEFAULT '',
  creator_type_tag text,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shorts" ON public.shorts FOR SELECT USING (true);
CREATE POLICY "Creators manage own shorts" ON public.shorts FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Service role full access shorts" ON public.shorts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Stream Recordings
CREATE TABLE public.stream_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  mux_asset_id text,
  playback_id text,
  title text NOT NULL DEFAULT 'Untitled Recording',
  description text NOT NULL DEFAULT '',
  duration_seconds integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  is_free boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stream_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published recordings" ON public.stream_recordings FOR SELECT USING (is_published = true);
CREATE POLICY "Creators can view own recordings" ON public.stream_recordings FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creators manage own recordings" ON public.stream_recordings FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Service role full access recordings" ON public.stream_recordings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- YouTube Imports
CREATE TABLE public.youtube_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  youtube_url text NOT NULL,
  youtube_video_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  thumbnail_url text,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.youtube_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view youtube imports" ON public.youtube_imports FOR SELECT USING (true);
CREATE POLICY "Creators manage own imports" ON public.youtube_imports FOR ALL TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- Views Log
CREATE TABLE public.views_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  asset_type text NOT NULL,
  asset_id text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.views_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert views" ON public.views_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access views" ON public.views_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_views_log_dedup ON public.views_log(user_id, asset_type, asset_id, viewed_at);

-- Enable realtime for interactive tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.shorts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_subscriptions;
