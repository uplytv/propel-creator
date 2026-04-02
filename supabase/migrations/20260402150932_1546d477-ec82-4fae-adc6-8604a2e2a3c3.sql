
-- NEWSLETTER FEATURE
CREATE TABLE IF NOT EXISTS public.creator_newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  preview_text text,
  html_content text,
  plain_text_content text,
  status text NOT NULL DEFAULT 'draft',
  recipient_type text NOT NULL DEFAULT 'all_members',
  recipient_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES public.creator_newsletters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  status text DEFAULT 'pending',
  opened_at timestamptz,
  sent_at timestamptz,
  UNIQUE(newsletter_id, user_id)
);

-- MEMBER REFERRAL PROGRAM
CREATE TABLE IF NOT EXISTS public.member_referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  reward_type text DEFAULT 'free_month',
  reward_value numeric DEFAULT 1,
  reward_description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  code text UNIQUE NOT NULL,
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, creator_id)
);

CREATE TABLE IF NOT EXISTS public.member_referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.member_referral_codes(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  reward_issued boolean DEFAULT false,
  converted_at timestamptz DEFAULT now(),
  UNIQUE(referral_code_id, referred_user_id)
);

CREATE TABLE IF NOT EXISTS public.member_referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  conversion_id uuid REFERENCES public.member_referral_conversions(id),
  reward_type text NOT NULL,
  reward_value numeric NOT NULL,
  reward_description text,
  is_redeemed boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- CUSTOM DOMAINS AND PAGES
CREATE TABLE IF NOT EXISTS public.creator_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE,
  subdomain text,
  custom_domain text UNIQUE,
  domain_status text DEFAULT 'pending',
  ssl_status text DEFAULT 'pending',
  cname_target text DEFAULT 'cname.uply.tv',
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  page_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  slug text NOT NULL,
  is_published boolean DEFAULT false,
  is_home boolean DEFAULT false,
  view_count integer DEFAULT 0,
  content jsonb DEFAULT '{}',
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(creator_id, slug)
);

CREATE TABLE IF NOT EXISTS public.bio_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  icon text,
  link_type text DEFAULT 'custom',
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.page_email_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.creator_pages(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  captured_at timestamptz DEFAULT now(),
  user_id uuid
);

-- LIVE COMMERCE PIN OVERLAY
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS impression_count integer DEFAULT 0;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0;

-- CHURN PREDICTION
CREATE TABLE IF NOT EXISTS public.member_churn_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  churn_probability numeric NOT NULL DEFAULT 0,
  risk_level text,
  days_since_last_active integer,
  engagement_score numeric,
  intervention_sent boolean DEFAULT false,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, creator_id)
);

-- BRAND DEAL MARKETPLACE
CREATE TABLE IF NOT EXISTS public.brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL,
  website text,
  industry text,
  logo_url text,
  description text,
  verified boolean DEFAULT false,
  total_campaigns integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.brand_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  campaign_type text NOT NULL,
  budget_min numeric NOT NULL DEFAULT 0,
  budget_max numeric NOT NULL DEFAULT 0,
  target_niches text[] DEFAULT '{}',
  target_min_members integer DEFAULT 0,
  deliverables text NOT NULL DEFAULT '',
  timeline_days integer NOT NULL DEFAULT 30,
  application_deadline date,
  max_creators integer DEFAULT 10,
  status text DEFAULT 'active',
  application_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  pitch text NOT NULL DEFAULT '',
  proposed_rate numeric,
  status text DEFAULT 'pending',
  applied_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, creator_id)
);

CREATE TABLE IF NOT EXISTS public.brand_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.brand_campaigns(id),
  application_id uuid REFERENCES public.campaign_applications(id),
  brand_id uuid NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  agreed_rate numeric NOT NULL DEFAULT 0,
  deliverables text NOT NULL DEFAULT '',
  deadline date,
  status text DEFAULT 'active',
  uply_fee_percentage numeric DEFAULT 10,
  uply_fee_amount numeric DEFAULT 0,
  creator_payout_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.brand_deals(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- PODCAST HOSTING
CREATE TABLE IF NOT EXISTS public.creator_podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  author text,
  artwork_url text,
  category text,
  language text DEFAULT 'en',
  is_explicit boolean DEFAULT false,
  is_private boolean DEFAULT false,
  subscriber_count integer DEFAULT 0,
  total_plays integer DEFAULT 0,
  spotify_url text,
  apple_podcasts_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id uuid NOT NULL REFERENCES public.creator_podcasts(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  show_notes text,
  audio_url text NOT NULL DEFAULT '',
  audio_duration integer,
  audio_file_size bigint,
  episode_number integer,
  season_number integer DEFAULT 1,
  episode_type text DEFAULT 'full',
  is_explicit boolean DEFAULT false,
  is_published boolean DEFAULT false,
  is_members_only boolean DEFAULT false,
  published_at timestamptz,
  play_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- PUSH NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS
ALTER TABLE public.creator_newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_email_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_churn_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Creators manage own newsletters" ON public.creator_newsletters FOR ALL TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Public read active campaigns" ON public.brand_campaigns FOR SELECT TO authenticated USING (status = 'active');
CREATE POLICY "Brands manage own campaigns" ON public.brand_campaigns FOR ALL TO authenticated USING (brand_id IN (SELECT id FROM public.brand_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators manage own applications" ON public.campaign_applications FOR ALL TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Public read active bio links" ON public.bio_links FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Creators manage own bio links" ON public.bio_links FOR ALL TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Public read published pages" ON public.creator_pages FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Creators manage own pages" ON public.creator_pages FOR ALL TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Anyone submit email capture" ON public.page_email_captures FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Creators manage own domains" ON public.creator_domains FOR ALL TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators read own churn predictions" ON public.member_churn_predictions FOR SELECT TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Public read active podcasts" ON public.creator_podcasts FOR SELECT TO anon, authenticated USING (is_private = false);
CREATE POLICY "Creators manage own podcasts" ON public.creator_podcasts FOR ALL TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Public read published episodes" ON public.podcast_episodes FOR SELECT TO anon, authenticated USING (is_published = true AND is_members_only = false);
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions FOR ALL TO authenticated USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Referral programs readable" ON public.member_referral_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators manage referral programs" ON public.member_referral_programs FOR ALL TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Members view own codes" ON public.member_referral_codes FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Deal participants view messages" ON public.deal_messages FOR ALL TO authenticated USING (
  deal_id IN (SELECT id FROM public.brand_deals WHERE creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  OR deal_id IN (SELECT bd.id FROM public.brand_deals bd JOIN public.brand_profiles bp ON bp.id = bd.brand_id WHERE bp.user_id = auth.uid())
);
CREATE POLICY "Brand profiles readable" ON public.brand_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own brand profile" ON public.brand_profiles FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Newsletter recipients by creator" ON public.newsletter_recipients FOR ALL TO authenticated USING (newsletter_id IN (SELECT id FROM public.creator_newsletters WHERE creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Members manage own referral codes" ON public.member_referral_codes FOR ALL TO authenticated USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators view brand deals" ON public.brand_deals FOR SELECT TO authenticated USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR brand_id IN (SELECT id FROM public.brand_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators manage own podcasts episodes" ON public.podcast_episodes FOR ALL TO authenticated USING (podcast_id IN (SELECT id FROM public.creator_podcasts WHERE creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Creators read page captures" ON public.page_email_captures FOR SELECT TO authenticated USING (page_id IN (SELECT id FROM public.creator_pages WHERE creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Referral rewards viewable" ON public.member_referral_rewards FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Referral conversions viewable" ON public.member_referral_conversions FOR SELECT TO authenticated USING (referral_code_id IN (SELECT id FROM public.member_referral_codes WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_newsletters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.podcast_episodes;
