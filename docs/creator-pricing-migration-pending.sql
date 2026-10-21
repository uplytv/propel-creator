-- Pending additive migration, NOT applied. Managed migration directory rejects manual files.
-- No backfill or changes to legacy subscribers.
CREATE TABLE IF NOT EXISTS public.creator_billing_plans (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL CHECK (plan IN ('free', 'pro', 'studio')),
  status text NOT NULL DEFAULT 'active',
  stripe_subscription_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  stripe_event_created bigint NOT NULL DEFAULT 0
);
GRANT ALL ON public.creator_billing_plans TO service_role;
REVOKE ALL ON public.creator_billing_plans FROM anon, authenticated;
ALTER TABLE public.creator_billing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY creator_billing_plans_service_only ON public.creator_billing_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.sync_creator_billing_plan(
  p_user_id uuid, p_plan text, p_status text, p_subscription_id text, p_event_created bigint
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.creator_billing_plans
    (user_id, plan, status, stripe_subscription_id, stripe_event_created)
  VALUES (p_user_id, p_plan, p_status, p_subscription_id, p_event_created)
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan, status = EXCLUDED.status,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_event_created = EXCLUDED.stripe_event_created, updated_at = now()
  WHERE creator_billing_plans.stripe_event_created <= EXCLUDED.stripe_event_created;
$$;
REVOKE ALL ON FUNCTION public.sync_creator_billing_plan(uuid,text,text,text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_creator_billing_plan(uuid,text,text,text,bigint) TO service_role;