-- Founders Access: track who has it, what plan, counter RPC
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founders_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founders_plan text,
  ADD COLUMN IF NOT EXISTS founders_since timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_founders_access
  ON public.profiles(founders_access) WHERE founders_access = true;

-- Public counter (count of founders) + cap
CREATE OR REPLACE FUNCTION public.get_founders_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'claimed', (SELECT COUNT(*) FROM public.profiles WHERE founders_access = true),
    'cap', COALESCE(
      (SELECT (value)::int FROM public.platform_config WHERE key = 'founders_seat_cap'),
      100
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_founders_stats() TO anon, authenticated;

INSERT INTO public.platform_config (key, value)
VALUES ('founders_seat_cap', '100')
ON CONFLICT (key) DO NOTHING;