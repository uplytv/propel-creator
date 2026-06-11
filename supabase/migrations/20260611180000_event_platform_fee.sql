-- Per-event configurable platform fee (explicitly requested).
-- Additive: new column with the existing 5% as the default, so all current
-- events and the legacy flow are unchanged. Stored as a fraction (0.05 = 5%).
-- Capped at 30% to prevent fat-finger / abusive values.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS platform_fee_pct numeric NOT NULL DEFAULT 0.05
  CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 0.30);

COMMENT ON COLUMN public.events.platform_fee_pct IS
  'Platform fee as a fraction of ticket price (0.05 = 5%). Default 5%; creator-configurable per event. Read by the purchase-ticket edge function.';
