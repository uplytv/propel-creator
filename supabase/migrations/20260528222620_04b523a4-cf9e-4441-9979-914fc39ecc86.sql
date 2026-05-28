
-- 1. Fix search_path on user-defined functions
ALTER FUNCTION public.generate_slug(text) SET search_path = public;
ALTER FUNCTION public.radiate_distance_km(double precision, double precision, double precision, double precision) SET search_path = public;
ALTER FUNCTION public.validate_vanity_slug(text) SET search_path = public;

-- 2. Move pgvector extension out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;

-- 3. Drop redundant service_role "USING(true) WITH CHECK(true)" policies
-- service_role bypasses RLS entirely, so these policies are pure noise and trigger the permissive-RLS linter warning.
DROP POLICY IF EXISTS "Service role full access stripe accounts" ON public.creator_stripe_accounts;
DROP POLICY IF EXISTS "Service role full access tiers" ON public.subscription_tiers;
DROP POLICY IF EXISTS "Service role full access subs" ON public.member_subscriptions;
DROP POLICY IF EXISTS "Service role full access tasks" ON public.aria_agent_tasks;
DROP POLICY IF EXISTS "Service role full access affiliate links" ON public.affiliate_links;
DROP POLICY IF EXISTS "Service role full access conversions" ON public.affiliate_conversions;
DROP POLICY IF EXISTS "Service role full access creator affiliate members" ON public.creator_affiliate_members;
DROP POLICY IF EXISTS "Anyone can bump search count" ON public.trending_searches;
DROP POLICY IF EXISTS "Service role full access clips" ON public.clips;
DROP POLICY IF EXISTS "Service role full access shorts" ON public.shorts;
DROP POLICY IF EXISTS "Service role full access recordings" ON public.stream_recordings;
DROP POLICY IF EXISTS "Service role manages webhook logs" ON public.stripe_webhook_log;
DROP POLICY IF EXISTS "Service role full access views" ON public.views_log;
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.aria_rate_limits;
DROP POLICY IF EXISTS "Service role full access agents" ON public.aria_agents;
DROP POLICY IF EXISTS "Service role full access memory" ON public.aria_agent_memory;
DROP POLICY IF EXISTS "Service role full access handoffs" ON public.aria_agent_handoffs;
DROP POLICY IF EXISTS "Service role full access insights" ON public.aria_agent_insights;
DROP POLICY IF EXISTS "Service role full access reports" ON public.aria_daily_reports;
DROP POLICY IF EXISTS "Service role full access funnels" ON public.aria_funnels;
DROP POLICY IF EXISTS "Service role full access sales" ON public.aria_sales_conversations;
DROP POLICY IF EXISTS "Service role full access usage" ON public.aria_usage_tracking;
DROP POLICY IF EXISTS "Service role full access learnings" ON public.aria_platform_learnings;
DROP POLICY IF EXISTS "Service role manages unsubscribes" ON public.email_unsubscribes;
DROP POLICY IF EXISTS "Service role manages simulcast sessions" ON public.stream_simulcast_sessions;
DROP POLICY IF EXISTS "Service role manages test logs" ON public.simulcast_test_log;
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.edge_function_rate_limits;
DROP POLICY IF EXISTS "Service role manages auth rate limits" ON public.auth_rate_limits;
DROP POLICY IF EXISTS "Service role manages webhook errors" ON public.webhook_errors;
DROP POLICY IF EXISTS "Service role manages scores" ON public.video_discovery_scores;
DROP POLICY IF EXISTS "Service role full access mentions" ON public.mentions;
DROP POLICY IF EXISTS "Service role full access aria actions" ON public.aria_actions;
