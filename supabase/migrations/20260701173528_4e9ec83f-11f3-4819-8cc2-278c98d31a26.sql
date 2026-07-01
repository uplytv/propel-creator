
CREATE TABLE IF NOT EXISTS public.blake_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS blake_subscribers_email_key ON public.blake_subscribers(lower(email));
CREATE INDEX IF NOT EXISTS blake_subscribers_user_id_idx ON public.blake_subscribers(user_id);

GRANT SELECT ON public.blake_subscribers TO authenticated;
GRANT ALL ON public.blake_subscribers TO service_role;

ALTER TABLE public.blake_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own blake subscription"
  ON public.blake_subscribers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
