
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL DEFAULT 'login',
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_rate_limits_lookup ON public.auth_rate_limits (identifier, action_type, window_start);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  p_identifier text,
  p_action_type text DEFAULT 'login',
  p_max_attempts integer DEFAULT 10,
  p_window_seconds integer DEFAULT 900,
  p_block_seconds integer DEFAULT 1800
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record auth_rate_limits%ROWTYPE;
  v_now timestamptz := now();
  v_window_start timestamptz := v_now - (p_window_seconds || ' seconds')::interval;
  v_total_attempts integer;
  v_result jsonb;
BEGIN
  -- Check if currently blocked
  SELECT * INTO v_record
  FROM auth_rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND blocked_until IS NOT NULL
    AND blocked_until > v_now
  ORDER BY blocked_until DESC
  LIMIT 1;

  IF v_record IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'retry_after', extract(epoch from (v_record.blocked_until - v_now))::integer
    );
  END IF;

  -- Count attempts in window
  SELECT COALESCE(SUM(attempt_count), 0) INTO v_total_attempts
  FROM auth_rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_start >= v_window_start
    AND blocked_until IS NULL;

  IF v_total_attempts >= p_max_attempts THEN
    -- Block the identifier
    INSERT INTO auth_rate_limits (identifier, action_type, attempt_count, blocked_until)
    VALUES (p_identifier, p_action_type, 0, v_now + (p_block_seconds || ' seconds')::interval);

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'retry_after', p_block_seconds
    );
  END IF;

  -- Record the attempt
  INSERT INTO auth_rate_limits (identifier, action_type, attempt_count, window_start)
  VALUES (p_identifier, p_action_type, 1, v_now);

  RETURN jsonb_build_object(
    'allowed', true,
    'attempts_remaining', p_max_attempts - v_total_attempts - 1
  );
END;
$$;

-- Cleanup old records daily
SELECT cron.schedule(
  'cleanup-auth-rate-limits',
  '0 3 * * *',
  $$DELETE FROM public.auth_rate_limits WHERE created_at < now() - interval '24 hours'$$
);
