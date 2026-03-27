-- PROBLEM 1: Fix confidence initialization to 0.65 instead of default 0.5
CREATE OR REPLACE FUNCTION public.on_creator_space_created_init_agents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO aria_agents (creator_id, agent_type, confidence_score)
  VALUES
    (NEW.creator_id, 'content', 0.65),
    (NEW.creator_id, 'growth', 0.65),
    (NEW.creator_id, 'community', 0.65),
    (NEW.creator_id, 'sales', 0.65),
    (NEW.creator_id, 'operations', 0.65)
  ON CONFLICT (creator_id, agent_type) DO NOTHING;

  INSERT INTO aria_usage_tracking (creator_id, month, budget_limit)
  VALUES (NEW.creator_id, date_trunc('month', now())::date, 500)
  ON CONFLICT (creator_id, month) DO NOTHING;

  RETURN NEW;
END;
$$;