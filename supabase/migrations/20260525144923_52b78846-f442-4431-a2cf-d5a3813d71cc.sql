
-- 1. Drop sensitive tables from supabase_realtime publication to prevent WAL leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.mux_live_streams;
ALTER PUBLICATION supabase_realtime DROP TABLE public.paid_dms;
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE public.access_grants;
ALTER PUBLICATION supabase_realtime DROP TABLE public.weekly_growth_reports;
ALTER PUBLICATION supabase_realtime DROP TABLE public.stripe_webhook_log;
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_notification_batch;
ALTER PUBLICATION supabase_realtime DROP TABLE public.aria_agent_tasks;
ALTER PUBLICATION supabase_realtime DROP TABLE public.aria_agent_handoffs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.aria_agent_insights;

-- 2. Lock down broadcast_tracking_events INSERT to service_role only
DROP POLICY IF EXISTS "Service inserts tracking" ON public.broadcast_tracking_events;
CREATE POLICY "Service role inserts tracking"
ON public.broadcast_tracking_events
FOR INSERT
TO service_role
WITH CHECK (true);
