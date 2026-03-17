
-- ============================================================
-- 1. ARIA RATE LIMITS TABLE
-- ============================================================
CREATE TABLE public.aria_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aria_rate_limits_user_id ON public.aria_rate_limits(user_id);

ALTER TABLE public.aria_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role manages rate limits"
  ON public.aria_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. ONBOARDING EVENTS TABLE
-- ============================================================
CREATE TABLE public.onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  step TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own onboarding events
CREATE POLICY "Users insert own onboarding events"
  ON public.onboarding_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own onboarding events
CREATE POLICY "Users view own onboarding events"
  ON public.onboarding_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all onboarding events for funnel analytics
CREATE POLICY "Admins view all onboarding events"
  ON public.onboarding_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. STRIPE WEBHOOK LOG TABLE
-- ============================================================
CREATE TABLE public.stripe_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stripe_webhook_log_event_id ON public.stripe_webhook_log(stripe_event_id);
CREATE INDEX idx_stripe_webhook_log_status ON public.stripe_webhook_log(status);

ALTER TABLE public.stripe_webhook_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role manages webhook logs"
  ON public.stripe_webhook_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins can view webhook logs
CREATE POLICY "Admins view webhook logs"
  ON public.stripe_webhook_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. HARDEN FINANCIAL RLS POLICIES
-- ============================================================

-- wallets: Add UPDATE policy for own row (currently only SELECT exists)
CREATE POLICY "Users update own wallet"
  ON public.wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- creator_stripe_accounts: Add UPDATE policy for own row
CREATE POLICY "Creators can update own stripe account"
  ON public.creator_stripe_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);
