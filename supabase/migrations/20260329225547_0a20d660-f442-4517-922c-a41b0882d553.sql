
CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read platform_config"
ON public.platform_config FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.platform_config (key, value, description)
VALUES ('waitlist_base_count', '24200', 'Base offset added to real signup count for the landing page mission counter. Update this value to adjust the displayed floor without touching code.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
