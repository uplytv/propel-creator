-- ═══════════════════════════════════════════════════════════════
-- CRM v2 — self-maintaining contacts + automation hooks
--
-- v1 (20260706090000) required a manual "Sync contacts" click that ran
-- crm_sync_contacts(). v2 makes the CRM maintain itself:
--
--   1. AUTO-SYNC: SECURITY DEFINER AFTER INSERT triggers on the five
--      source tables (community_members, subscribers, product_purchases,
--      tickets, public_booking_inquiries) + member_subscriptions upsert
--      into crm_contacts as rows arrive. The per-row upsert lives in a
--      shared fn (crm_upsert_contact / crm_upsert_contact_for_user)
--      whose conflict-resolution semantics mirror crm_sync_contacts
--      exactly (keep original source/stage/name, fill gaps, advance
--      last_activity_at). crm_sync_contacts itself is intentionally
--      left untouched: its set-based statements are the efficient bulk
--      backfill path ("Re-sync all" in the UI) and rewriting it as a
--      per-row loop over the shared fn would regress large syncs.
--
--   2. STAGE AUTO-ADVANCE: purchase-ish events (completed product
--      purchase, non-refunded ticket, active member subscription)
--      advance the matching contact lead/engaged -> customer. Never
--      downgrades; vip is only ever set manually.
--
--   3. AUTOMATION HOOK: when a contact's stage changes, enroll its
--      email into the creator's ACTIVE drip sequences whose
--      trigger_event = 'crm_stage_<new stage>' (e.g. crm_stage_customer).
--      drip_sequences.trigger_event is free text (no CHECK/enum — see
--      20260416141659), so the convention is purely additive.
--
--   4. value_cents: nullable deal-value column for the pipeline strip.
--
-- Additive only: no DROP TABLE/COLUMN, no destructive ALTER.
-- RLS: no new tables are created. crm_contacts.value_cents is covered
-- by the existing row-level policy "Creators manage own crm contacts"
-- (RLS is row-scoped, so new columns inherit it) and the existing
-- table-level GRANTs. All trigger writes go through SECURITY DEFINER
-- functions because source-table inserts come from members/anon/service
-- roles that must not (and per RLS cannot) write another creator's CRM.
-- Every trigger body is wrapped in a warning-only exception handler so
-- CRM bookkeeping can never block a join/purchase/subscribe insert.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Deal value column ────────────────────────────────────────

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS value_cents integer
  CHECK (value_cents IS NULL OR value_cents >= 0);

-- ── 2. Shared upsert fns (same mapping crm_sync_contacts uses) ──

-- Single-row upsert. Mirrors the ON CONFLICT semantics of every branch
-- of crm_sync_contacts: existing contacts keep their original
-- source/stage/name/user_id; we only fill gaps and advance
-- last_activity_at. SECURITY DEFINER because callers (triggers firing
-- as members/anon/service_role) cannot pass crm_contacts RLS.
CREATE OR REPLACE FUNCTION public.crm_upsert_contact(
  p_creator_id uuid,
  p_user_id uuid,
  p_email text,
  p_name text,
  p_source text,
  p_activity_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_creator_id IS NULL OR p_email IS NULL OR btrim(p_email) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.crm_contacts (creator_id, user_id, email, name, source, last_activity_at)
  VALUES (
    p_creator_id,
    p_user_id,
    lower(btrim(p_email)),
    NULLIF(btrim(COALESCE(p_name, '')), ''),
    p_source,
    p_activity_at
  )
  ON CONFLICT (creator_id, email) DO UPDATE SET
    user_id = COALESCE(public.crm_contacts.user_id, EXCLUDED.user_id),
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(
      COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at),
      COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at)
    );
END;
$$;

-- user_id-keyed variant: resolves email from auth.users and name from
-- profiles (same COALESCE chain crm_sync_contacts uses), then delegates.
-- Returns the resolved email so callers can chain a stage advance.
CREATE OR REPLACE FUNCTION public.crm_upsert_contact_for_user(
  p_creator_id uuid,
  p_user_id uuid,
  p_source text,
  p_activity_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  IF p_creator_id IS NULL OR p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    lower(au.email),
    COALESCE(
      NULLIF(btrim(pr.display_name), ''),
      NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
      pr.username
    )
  INTO v_email, v_name
  FROM auth.users au
  LEFT JOIN public.profiles pr ON pr.user_id = au.id
  WHERE au.id = p_user_id;

  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM public.crm_upsert_contact(p_creator_id, p_user_id, v_email, v_name, p_source, p_activity_at);
  RETURN v_email;
END;
$$;

-- Stage auto-advance: lead/engaged -> customer on purchase-ish events.
-- Never downgrades (customer stays customer); vip is manual-only, so it
-- is excluded from the WHERE and can never be overwritten here.
CREATE OR REPLACE FUNCTION public.crm_advance_stage_to_customer(
  p_creator_id uuid,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_creator_id IS NULL OR p_email IS NULL OR btrim(p_email) = '' THEN
    RETURN;
  END IF;

  UPDATE public.crm_contacts
     SET stage = 'customer'
   WHERE creator_id = p_creator_id
     AND email = lower(btrim(p_email))
     AND stage IN ('lead', 'engaged');
END;
$$;

-- Lock the helpers down: only trigger bodies (running as the definer,
-- which owns these fns) may call them. An authenticated user calling
-- crm_upsert_contact directly could otherwise write into another
-- creator's CRM.
REVOKE ALL ON FUNCTION public.crm_upsert_contact(uuid, uuid, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_upsert_contact_for_user(uuid, uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_advance_stage_to_customer(uuid, text) FROM PUBLIC, anon, authenticated;

-- ── 3. Auto-sync triggers (never block the source insert) ──────

-- 3a. community_members → source 'member'
CREATE OR REPLACE FUNCTION public.crm_auto_sync_community_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.crm_upsert_contact_for_user(NEW.creator_id, NEW.user_id, 'member', NEW.joined_at);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (community_members %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_auto_sync_community_member ON public.community_members;
CREATE TRIGGER trg_crm_auto_sync_community_member
  AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_community_member();

-- 3b. subscribers → source 'subscriber' (email/name live on the row)
CREATE OR REPLACE FUNCTION public.crm_auto_sync_subscriber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.crm_upsert_contact(NEW.creator_id, NULL, NEW.email, NEW.name, 'subscriber', NEW.created_at);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (subscribers %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_auto_sync_subscriber ON public.subscribers;
CREATE TRIGGER trg_crm_auto_sync_subscriber
  AFTER INSERT ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_subscriber();

-- 3c. product_purchases → source 'buyer' (completed only, matching
--     crm_sync_contacts). Also fires on status flips to 'completed'
--     (e.g. pending → completed) so deferred captures still advance
--     the pipeline. Completed purchase ⇒ stage advance.
CREATE OR REPLACE FUNCTION public.crm_auto_sync_product_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  BEGIN
    IF NEW.status = 'completed'
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      v_email := public.crm_upsert_contact_for_user(NEW.creator_id, NEW.buyer_id, 'buyer', NEW.created_at);
      PERFORM public.crm_advance_stage_to_customer(NEW.creator_id, v_email);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (product_purchases %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_auto_sync_product_purchase ON public.product_purchases;
CREATE TRIGGER trg_crm_auto_sync_product_purchase
  AFTER INSERT OR UPDATE OF status ON public.product_purchases
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_product_purchase();

-- 3d. tickets → source 'ticket' (any non-refunded ticket, matching
--     crm_sync_contacts). Ticket purchase ⇒ stage advance.
CREATE OR REPLACE FUNCTION public.crm_auto_sync_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  BEGIN
    IF NEW.status <> 'refunded' THEN
      v_email := public.crm_upsert_contact_for_user(NEW.creator_id, NEW.buyer_id, 'ticket', NEW.created_at);
      PERFORM public.crm_advance_stage_to_customer(NEW.creator_id, v_email);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (tickets %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_auto_sync_ticket ON public.tickets;
CREATE TRIGGER trg_crm_auto_sync_ticket
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_ticket();

-- 3e. public_booking_inquiries → source 'booking'. No creator_id on the
--     row: artist_slug maps to profiles.username (same join
--     crm_sync_contacts uses). Unknown slug ⇒ silently skip.
CREATE OR REPLACE FUNCTION public.crm_auto_sync_booking_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  BEGIN
    SELECT pr.user_id
      INTO v_creator_id
      FROM public.profiles pr
     WHERE pr.username IS NOT NULL
       AND lower(pr.username) = lower(NEW.artist_slug)
     LIMIT 1;

    IF v_creator_id IS NOT NULL THEN
      PERFORM public.crm_upsert_contact(v_creator_id, NULL, NEW.contact_email, NEW.contact_name, 'booking', NEW.created_at);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (public_booking_inquiries %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_auto_sync_booking_inquiry ON public.public_booking_inquiries;
CREATE TRIGGER trg_crm_auto_sync_booking_inquiry
  AFTER INSERT ON public.public_booking_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_booking_inquiry();

-- 3f. member_subscriptions → source 'member' (crm_sync_contacts folds
--     paying subs into the member group). Active subscription ⇒ stage
--     advance; UPDATE path only acts on a transition INTO 'active'.
CREATE OR REPLACE FUNCTION public.crm_auto_sync_member_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status <> 'active') THEN
      RETURN NEW;
    END IF;

    v_email := public.crm_upsert_contact_for_user(
      NEW.creator_id,
      NEW.member_id,
      'member',
      GREATEST(NEW.created_at, COALESCE(NEW.current_period_start, NEW.created_at))
    );
    IF NEW.status = 'active' THEN
      PERFORM public.crm_advance_stage_to_customer(NEW.creator_id, v_email);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (member_subscriptions %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_auto_sync_member_subscription ON public.member_subscriptions;
CREATE TRIGGER trg_crm_auto_sync_member_subscription
  AFTER INSERT OR UPDATE OF status ON public.member_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_member_subscription();

-- ── 4. Automation hook: stage change → drip enrollment ─────────
-- Convention: a drip sequence with trigger_event = 'crm_stage_<stage>'
-- ('crm_stage_lead' | 'crm_stage_engaged' | 'crm_stage_customer' |
--  'crm_stage_vip') receives the contact's email whenever the contact
-- ENTERS that stage (manual drag/select in the CRM UI or the automatic
-- advance above — both are UPDATEs on crm_contacts.stage, so both fire).
-- Idempotent via UNIQUE(sequence_id, subscriber_email) + ON CONFLICT
-- DO NOTHING; the 15-minute process-drip-sequences heartbeat
-- (20260706120000) picks enrollments up from there.
CREATE OR REPLACE FUNCTION public.crm_enroll_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    BEGIN
      INSERT INTO public.drip_sequence_enrollments (sequence_id, subscriber_email)
      SELECT ds.id, NEW.email
        FROM public.drip_sequences ds
       WHERE ds.creator_id = NEW.creator_id
         AND ds.status = 'active'
         AND ds.trigger_event = 'crm_stage_' || NEW.stage
      ON CONFLICT (sequence_id, subscriber_email) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'crm stage-change drip enrollment failed for contact %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_enroll_on_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_community_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_subscriber() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_product_purchase() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_ticket() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_booking_inquiry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_member_subscription() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_crm_enroll_on_stage_change ON public.crm_contacts;
CREATE TRIGGER trg_crm_enroll_on_stage_change
  AFTER UPDATE OF stage ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_enroll_on_stage_change();
