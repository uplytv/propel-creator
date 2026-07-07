-- ═══════════════════════════════════════════════════════════════════════════
-- ANNUAL BILLING + PER-TIER WELCOME MESSAGES (LTV lever)
--
-- 1. subscription_tiers gains:
--      price_yearly            numeric  NULL   (NULL = annual not offered)
--      stripe_price_id_yearly  text     NULL   (lazily-created yearly Stripe
--                                               price, cached like the monthly
--                                               stripe_price_id)
--      welcome_message         text     NULL   (≤1000 chars; sent to new
--                                               members when they join)
-- 2. Welcome delivery via SECURITY DEFINER AFTER INSERT triggers on
--    member_subscriptions + community_members (never-block pattern, dedupe
--    per member+creator) — the Stripe webhook is NOT touched.
--
-- RLS: NO policy changes needed. subscription_tiers policies are row-level
-- and already cover every column ("Anyone can view active tiers" SELECT
-- USING(true); "Creators manage own tiers" ALL auth.uid() = creator_id;
-- service-role ALL — 20260316165614). New columns inherit them.
-- Additive only: no drops, no data rewritten, 95/5 split untouched.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Columns ───────────────────────────────────────────────────────────────
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS price_yearly numeric,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text,
  ADD COLUMN IF NOT EXISTS welcome_message text;

DO $$ BEGIN
  ALTER TABLE public.subscription_tiers
    ADD CONSTRAINT subscription_tiers_price_yearly_positive
    CHECK (price_yearly IS NULL OR price_yearly > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.subscription_tiers
    ADD CONSTRAINT subscription_tiers_welcome_message_len
    CHECK (welcome_message IS NULL OR char_length(welcome_message) <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.subscription_tiers.price_yearly IS
  'Optional annual price in USD. NULL = annual billing not offered for this tier.';
COMMENT ON COLUMN public.subscription_tiers.stripe_price_id_yearly IS
  'Cached yearly Stripe price id. Created by stripe-create-tier, or lazily by stripe-create-checkout on first annual checkout.';
COMMENT ON COLUMN public.subscription_tiers.welcome_message IS
  'Creator-written welcome (≤1000 chars) delivered as an in-app notification to new members of this tier.';

-- ── 2a. Welcome on member_subscriptions INSERT (paid/trial joins) ────────────
-- Fires for active/trialing rows regardless of origin (Stripe webhook upsert,
-- comped/manual inserts). SECURITY DEFINER + never-block (EXCEPTION -> WARNING,
-- pattern of 20260706150000). Dedupe: one 'creator_welcome' per member+creator.
CREATE OR REPLACE FUNCTION public.notify_member_welcome()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_msg          TEXT;
  v_creator_name TEXT;
BEGIN
  BEGIN
    IF NEW.status NOT IN ('active', 'trialing') THEN
      RETURN NEW;
    END IF;
    IF NEW.member_id = NEW.creator_id OR NEW.tier_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT welcome_message INTO v_msg
    FROM public.subscription_tiers
    WHERE id = NEW.tier_id;

    IF v_msg IS NULL OR TRIM(v_msg) = '' THEN
      RETURN NEW;
    END IF;

    -- Dedupe: one welcome per member per creator (re-subscribes stay silent).
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.member_id
        AND type = 'creator_welcome'
        AND actor_id = NEW.creator_id
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username) INTO v_creator_name
    FROM public.profiles WHERE user_id = NEW.creator_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      NEW.member_id,
      'creator_welcome',
      'A welcome from ' || COALESCE(v_creator_name, 'your creator') || ' 👋',
      LEFT(v_msg, 1000),
      NEW.creator_id,
      NEW.tier_id::text,
      '/community/' || NEW.creator_id::text || '/community'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[annual_tiers] notify_member_welcome failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.member_subscriptions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_member_welcome ON public.member_subscriptions;
    CREATE TRIGGER trg_notify_member_welcome
      AFTER INSERT ON public.member_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.notify_member_welcome();
  ELSE
    RAISE NOTICE '[annual_tiers] public.member_subscriptions missing — trigger skipped';
  END IF;
END $$;

-- ── 2b. Welcome on community_members INSERT (free joins) ─────────────────────
-- creator_spaces has NO space-level welcome field (checked through
-- 20260706200000_community_depth), so free-community welcome is TIER-ONLY:
-- this trigger resolves the joining member's active/trialing subscription tier
-- and sends that tier's welcome_message. It is a belt-and-braces companion to
-- 2a (covers paths where the subscription row pre-exists / is updated rather
-- than inserted, e.g. webhook upsert-on-conflict, then community_members is
-- freshly inserted). Pure free joins with no paid tier receive no welcome.
-- Same dedupe key as 2a, so the pair can never double-send.
CREATE OR REPLACE FUNCTION public.notify_member_welcome_on_join()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_tier_id      UUID;
  v_msg          TEXT;
  v_creator_name TEXT;
BEGIN
  BEGIN
    IF NEW.user_id = NEW.creator_id THEN
      RETURN NEW;
    END IF;

    -- Tier-only source: the member's current active/trialing tier (if any).
    SELECT st.id, st.welcome_message INTO v_tier_id, v_msg
    FROM public.member_subscriptions ms
    JOIN public.subscription_tiers st ON st.id = ms.tier_id
    WHERE ms.member_id = NEW.user_id
      AND ms.creator_id = NEW.creator_id
      AND ms.status IN ('active', 'trialing')
    ORDER BY ms.created_at DESC
    LIMIT 1;

    IF v_msg IS NULL OR TRIM(v_msg) = '' THEN
      RETURN NEW;
    END IF;

    -- Dedupe shared with trg_notify_member_welcome (member+creator).
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.user_id
        AND type = 'creator_welcome'
        AND actor_id = NEW.creator_id
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username) INTO v_creator_name
    FROM public.profiles WHERE user_id = NEW.creator_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      NEW.user_id,
      'creator_welcome',
      'A welcome from ' || COALESCE(v_creator_name, 'your creator') || ' 👋',
      LEFT(v_msg, 1000),
      NEW.creator_id,
      v_tier_id::text,
      '/community/' || NEW.creator_id::text || '/community'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[annual_tiers] notify_member_welcome_on_join failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.community_members') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_member_welcome_join ON public.community_members;
    CREATE TRIGGER trg_notify_member_welcome_join
      AFTER INSERT ON public.community_members
      FOR EACH ROW EXECUTE FUNCTION public.notify_member_welcome_on_join();
  ELSE
    RAISE NOTICE '[annual_tiers] public.community_members missing — trigger skipped';
  END IF;
END $$;

-- Re-assert RLS idempotently (no-table-without-RLS rule; already enabled).
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
