
CREATE TABLE IF NOT EXISTS public.aria_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  intent text NOT NULL,
  parsed_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  requires_approval boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_aria_actions_creator_created
  ON public.aria_actions (creator_id, created_at DESC);

ALTER TABLE public.aria_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own aria actions"
  ON public.aria_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators insert own aria actions"
  ON public.aria_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators update own aria actions"
  ON public.aria_actions FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Service role full access aria actions"
  ON public.aria_actions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.aria_command_count_last_hour(_creator uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.aria_actions
  WHERE creator_id = _creator
    AND created_at > now() - interval '1 hour';
$$;
