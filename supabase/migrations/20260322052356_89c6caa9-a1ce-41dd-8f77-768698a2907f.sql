
-- access_grants: unified source of truth for all paid access
CREATE TABLE IF NOT EXISTS public.access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN (
    'membership_tier', 'product', 'course',
    'classroom', 'pdf', 'community', 'stream', 'job_post'
  )),
  resource_id uuid NOT NULL,
  access_level text NOT NULL DEFAULT 'full' CHECK (access_level IN ('full', 'preview', 'trial')),
  source text NOT NULL CHECK (source IN (
    'live_stream', 'profile_page', 'checkout',
    'admin_grant', 'affiliate', 'free_join'
  )),
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  stream_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  metadata jsonb DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_access_grants_user_resource ON public.access_grants (user_id, resource_type, resource_id);
CREATE INDEX idx_access_grants_stripe_sub ON public.access_grants (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_access_grants_stripe_pi ON public.access_grants (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_access_grants_stream ON public.access_grants (stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_access_grants_expires ON public.access_grants (expires_at) WHERE expires_at IS NOT NULL;

-- Unique constraint: one active grant per user per resource
CREATE UNIQUE INDEX idx_access_grants_unique_active ON public.access_grants (user_id, resource_type, resource_id) WHERE revoked_at IS NULL;

-- Webhook errors table
CREATE TABLE IF NOT EXISTS public.webhook_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  stripe_event_id text,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on access_grants
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own access grants"
  ON public.access_grants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for authenticated role - only service_role can write

-- RLS on webhook_errors (admin only via service_role)
ALTER TABLE public.webhook_errors ENABLE ROW LEVEL SECURITY;

-- Enable realtime for access_grants so useAccess can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_grants;
