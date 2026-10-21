-- Paid fan clubs: subscription/membership status can only be written by the
-- server (stripe-webhook / create-fan-club-checkout, service role).
-- Previously fans could INSERT/UPDATE their own row with status='active'.

ALTER TABLE public.music_fan_club_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mfcs_stripe_sub ON public.music_fan_club_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

DROP POLICY IF EXISTS "Fan creates own subs" ON public.music_fan_club_subscriptions;
DROP POLICY IF EXISTS "Fan updates own subs" ON public.music_fan_club_subscriptions;
DROP POLICY IF EXISTS "Fan deletes own subs" ON public.music_fan_club_subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.music_fan_club_subscriptions FROM anon, authenticated;

DROP POLICY IF EXISTS "Users insert own memberships" ON public.music_fan_club_memberships;
DROP POLICY IF EXISTS "Users update own memberships" ON public.music_fan_club_memberships;
REVOKE INSERT, UPDATE, DELETE ON public.music_fan_club_memberships FROM anon, authenticated;

-- Existing rows that were self-granted without a Stripe subscription on a paid
-- tier/club: report them, do not delete (review before revoking).
DO $$
DECLARE n1 int; n2 int;
BEGIN
  SELECT count(*) INTO n1 FROM public.music_fan_club_subscriptions s
    JOIN public.music_fan_club_tiers t ON t.id = s.tier_id
   WHERE s.status = 'active' AND s.stripe_subscription_id IS NULL AND t.price_cents > 0;
  SELECT count(*) INTO n2 FROM public.music_fan_club_memberships m
    JOIN public.music_fan_clubs c ON c.id = m.club_id
   WHERE m.status = 'active' AND m.stripe_subscription_id IS NULL AND c.monthly_price_cents > 0;
  RAISE NOTICE 'Unpaid active fan club rows to review: % tier subscriptions, % club memberships', n1, n2;
END $$;
