-- ============================================================
-- Phase 2 Security Hardening: edge_function_rate_limits cleanup
-- ============================================================
-- Phase 2 extends the existing edge_function_rate_limits mechanism to
-- unauthenticated endpoints keyed by IP (create-platform-checkout guest path,
-- track-affiliate-conversion, aria-event-copilot, aria-attendee-concierge,
-- aria-content-repurpose). Unlike per-user keys, IP keys are unbounded, so the
-- table needs the same daily pruning auth_rate_limits already has
-- (cleanup-auth-rate-limits, 20260325230038). Windows are at most 1 hour, so
-- rows untouched for 24h are dead weight.
--
-- RLS: edge_function_rate_limits already has RLS enabled (20260412080954);
-- service-role access bypasses RLS, and no client policies exist or are added.

SELECT cron.schedule(
  'cleanup-edge-function-rate-limits',
  '0 3 * * *',
  $$DELETE FROM public.edge_function_rate_limits WHERE updated_at < now() - interval '24 hours'$$
);
