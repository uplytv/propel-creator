
-- Add lifecycle stage and send-time optimization columns
ALTER TABLE public.subscribers 
  ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS optimal_send_hour integer,
  ADD COLUMN IF NOT EXISTS send_hour_data jsonb DEFAULT '{}';

-- Function to recalculate lifecycle stages for a creator's subscribers
CREATE OR REPLACE FUNCTION public.recalculate_subscriber_lifecycle(p_creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Churned: unsubscribed
  UPDATE subscribers SET lifecycle_stage = 'churned'
  WHERE creator_id = p_creator_id AND unsubscribed = true;

  -- At-risk: no activity in 30+ days, not unsubscribed
  UPDATE subscribers SET lifecycle_stage = 'at-risk'
  WHERE creator_id = p_creator_id AND unsubscribed = false
    AND (last_seen_at IS NULL OR last_seen_at < now() - interval '30 days')
    AND (last_open_at IS NULL OR last_open_at < now() - interval '30 days')
    AND created_at < now() - interval '7 days';

  -- New: joined within last 7 days
  UPDATE subscribers SET lifecycle_stage = 'new'
  WHERE creator_id = p_creator_id AND unsubscribed = false
    AND created_at > now() - interval '7 days';

  -- Loyal: high score (60+) and recent activity
  UPDATE subscribers SET lifecycle_stage = 'loyal'
  WHERE creator_id = p_creator_id AND unsubscribed = false
    AND COALESCE(lead_score, 0) >= 60
    AND (last_open_at IS NOT NULL AND last_open_at > now() - interval '30 days')
    AND created_at <= now() - interval '7 days';

  -- Engaged: moderate score or recent activity, not already loyal/new/at-risk/churned
  UPDATE subscribers SET lifecycle_stage = 'engaged'
  WHERE creator_id = p_creator_id AND unsubscribed = false
    AND lifecycle_stage NOT IN ('new', 'loyal', 'at-risk', 'churned')
    AND (COALESCE(lead_score, 0) >= 20 OR (last_open_at IS NOT NULL AND last_open_at > now() - interval '14 days'));
END;
$$;

-- Function to update optimal send hour from open tracking data
CREATE OR REPLACE FUNCTION public.update_subscriber_send_hour(p_email text, p_hour integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_data jsonb;
  hour_key text;
  current_count integer;
  best_hour integer;
  best_count integer;
BEGIN
  hour_key := p_hour::text;
  
  SELECT COALESCE(send_hour_data, '{}') INTO current_data
  FROM subscribers WHERE email = p_email LIMIT 1;
  
  current_count := COALESCE((current_data->>hour_key)::integer, 0) + 1;
  current_data := current_data || jsonb_build_object(hour_key, current_count);
  
  -- Find the hour with most opens
  best_hour := p_hour;
  best_count := current_count;
  
  SELECT (kv.key)::integer, (kv.value)::integer INTO best_hour, best_count
  FROM jsonb_each_text(current_data) kv
  ORDER BY (kv.value)::integer DESC
  LIMIT 1;
  
  UPDATE subscribers 
  SET send_hour_data = current_data, optimal_send_hour = best_hour
  WHERE email = p_email;
END;
$$;
