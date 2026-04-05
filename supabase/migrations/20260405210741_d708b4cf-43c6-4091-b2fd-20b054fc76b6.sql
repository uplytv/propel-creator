CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Default Key',
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  requests_today integer DEFAULT 0,
  requests_total integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own keys" ON public.api_keys FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.api_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.api_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own webhooks" ON public.api_webhooks FOR ALL TO authenticated USING (user_id = auth.uid());