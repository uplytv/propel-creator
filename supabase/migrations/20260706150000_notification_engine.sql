-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATION ENGINE — platform-wide in-app notifications
-- ═══════════════════════════════════════════════════════════════════════════
-- Fills the notification gaps NOT already covered by:
--   • 20260311163513: community_members ("member_joined"), follows
--     ("new_follower"), community_comments ("community_comment"),
--     community_post_likes ("community_like"), tip_transactions ("tip_received")
--   • stripe-webhook (DO NOT EDIT): product "sale"/"purchase", legacy
--     "event_ticket"/"event_ticket_sale", "new_subscriber"/
--     "subscription_confirmed", renewals, cancellations, payment failures
--   • finalize-cart-order: cart "sale"/"purchase"
--   • finalize-ticket-order: buyer "ticket" + seller "resale_sold"
--   • platform-dunning-check, tip-user, send-community-blast, etc.
--
-- Design rules:
--   • Every trigger function is SECURITY DEFINER, SET search_path = public.
--   • Every function body is wrapped so a failure NEVER blocks the source
--     insert (EXCEPTION WHEN OTHERS -> RAISE WARNING only).
--   • Dedupe guards wherever a re-fire is possible (retries, upsert races,
--     status flip-flops, message bursts).
--   • Triggers are only bound when the source table exists (to_regclass guard)
--     so this migration is safe against schema drift.
--   • classroom_lessons mass fan-out to members is DELIBERATELY skipped in v1
--     (needs digest/push infra, not one row per member per lesson).
-- ═══════════════════════════════════════════════════════════════════════════

-- Dedupe lookups used by the triggers below (user_id, type, reference_id).
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_ref
  ON public.notifications (user_id, type, reference_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. subscribers INSERT -> (creator) "New email subscriber"
--    Skips source='membership' (stripe-webhook auto-capture already produced a
--    "new_subscriber" notification for that event). Dedupe per creator+email.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_email_subscriber()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  BEGIN
    -- Paid-membership auto-capture is already notified by the Stripe webhook.
    IF COALESCE(NEW.source, '') = 'membership' THEN
      RETURN NEW;
    END IF;

    -- Dedupe: same email re-subscribing to the same creator.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.creator_id
        AND type = 'email_subscriber'
        AND reference_id = NEW.email
    ) THEN
      RETURN NEW;
    END IF;

    v_name := COALESCE(NULLIF(TRIM(NEW.name), ''), NEW.email);

    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (
      NEW.creator_id,
      'email_subscriber',
      'New Email Subscriber',
      v_name || ' subscribed to your email list',
      NEW.email,
      '/dashboard/subscribers'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_email_subscriber failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.subscribers') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_email_subscriber ON public.subscribers;
    CREATE TRIGGER trg_notify_email_subscriber
      AFTER INSERT ON public.subscribers
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_email_subscriber();
  ELSE
    RAISE NOTICE '[notification_engine] public.subscribers missing — trigger skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. member_subscriptions INSERT (active/trialing) -> (creator) "New paid member"
--    Stripe-managed rows (stripe_subscription_id set) are skipped: the Stripe
--    webhook upserts those AND emits its own "new_subscriber" notification.
--    This covers free/comped/manual membership inserts. Dedupe per member.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_paid_member()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_member_name TEXT;
BEGIN
  BEGIN
    IF NEW.status NOT IN ('active', 'trialing') THEN
      RETURN NEW;
    END IF;
    IF NEW.member_id = NEW.creator_id THEN
      RETURN NEW;
    END IF;
    -- Stripe checkout path already notifies the creator ("new_subscriber").
    IF NEW.stripe_subscription_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    -- Dedupe: one "new member" notification per member per creator.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.creator_id
        AND type IN ('new_paid_member', 'new_subscriber')
        AND actor_id = NEW.member_id
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username, 'Someone') INTO v_member_name
    FROM public.profiles WHERE user_id = NEW.member_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      NEW.creator_id,
      'new_paid_member',
      'New Member! 🎉',
      COALESCE(v_member_name, 'Someone') || ' became a ' ||
        CASE WHEN NEW.status = 'trialing' THEN 'trial' ELSE 'paid' END ||
        ' member of your community',
      NEW.member_id,
      NEW.id::text,
      '/dashboard'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_paid_member failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.member_subscriptions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_paid_member ON public.member_subscriptions;
    CREATE TRIGGER trg_notify_paid_member
      AFTER INSERT ON public.member_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_paid_member();
  ELSE
    RAISE NOTICE '[notification_engine] public.member_subscriptions missing — trigger skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. product_purchases INSERT -> (creator) "New sale: <product>"
--    Stripe paths (stripe-webhook single-product + finalize-cart-order) always
--    set stripe_payment_intent_id AND insert their own app-level "sale"
--    notification, so those rows are skipped here. Belt-and-braces existence
--    check on user_id+type+reference (+actor) before insert.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_product_sale()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_buyer_name   TEXT;
  v_product_name TEXT;
BEGIN
  BEGIN
    IF NEW.buyer_id = NEW.creator_id THEN
      RETURN NEW;
    END IF;
    -- App-level (Stripe) flows already notify the creator ("sale").
    IF NEW.stripe_payment_intent_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    -- Dedupe vs finalize-cart-order / stripe-webhook app-level notification
    -- (both use type='sale', reference_id=product_id, actor_id=buyer).
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.creator_id
        AND type = 'sale'
        AND reference_id = NEW.product_id::text
        AND actor_id = NEW.buyer_id
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username, 'Someone') INTO v_buyer_name
    FROM public.profiles WHERE user_id = NEW.buyer_id;
    SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      NEW.creator_id,
      'sale',
      'New Sale! 🎉',
      COALESCE(v_buyer_name, 'Someone') || ' purchased "' || COALESCE(v_product_name, 'a product') || '"' ||
        CASE WHEN COALESCE(NEW.amount, 0) > 0 THEN ' for $' || TRIM(TO_CHAR(NEW.amount, 'FM999999990.00')) ELSE '' END,
      NEW.buyer_id,
      NEW.product_id::text,
      '/wallet'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_product_sale failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.product_purchases') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_product_sale ON public.product_purchases;
    CREATE TRIGGER trg_notify_product_sale
      AFTER INSERT ON public.product_purchases
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_product_sale();
  ELSE
    RAISE NOTICE '[notification_engine] public.product_purchases missing — trigger skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. tickets INSERT (status=active, buyer != creator) -> (event creator)
--    "Ticket sold: <event>". The LEGACY stripe-webhook path (no order_id, no
--    tier_id, has payment intent) already notifies "event_ticket_sale" — those
--    rows are skipped. Tier/order tickets (finalize-ticket-order) only notified
--    the buyer before this trigger; resales UPDATE the ticket so never re-fire.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_ticket_sold()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_buyer_name  TEXT;
  v_event_title TEXT;
BEGIN
  BEGIN
    IF NEW.status <> 'active' THEN
      RETURN NEW;
    END IF;
    IF NEW.buyer_id = NEW.creator_id THEN
      RETURN NEW;
    END IF;
    -- Legacy webhook path (event-level tickets) already notifies the creator.
    IF NEW.order_id IS NULL AND NEW.tier_id IS NULL AND NEW.stripe_payment_intent_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    -- Dedupe: one notification per ticket row.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.creator_id
        AND type = 'ticket_sold'
        AND reference_id = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username, 'Someone') INTO v_buyer_name
    FROM public.profiles WHERE user_id = NEW.buyer_id;
    SELECT title INTO v_event_title FROM public.events WHERE id = NEW.event_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      NEW.creator_id,
      'ticket_sold',
      'Ticket Sold! 🎟️',
      COALESCE(v_buyer_name, 'Someone') || ' bought a ticket to "' || COALESCE(v_event_title, 'your event') || '"',
      NEW.buyer_id,
      NEW.id::text,
      '/events'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_ticket_sold failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.tickets') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_ticket_sold ON public.tickets;
    CREATE TRIGGER trg_notify_ticket_sold
      AFTER INSERT ON public.tickets
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_sold();
  ELSE
    RAISE NOTICE '[notification_engine] public.tickets missing — trigger skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. public_booking_inquiries INSERT -> (creator, via profiles.username =
--    artist_slug) "New booking inquiry from <name>". Slugs without a matching
--    profile (e.g. roster demo sites) are skipped silently.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_booking_inquiry()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_creator_uid UUID;
BEGIN
  BEGIN
    SELECT user_id INTO v_creator_uid
    FROM public.profiles
    WHERE LOWER(username) = LOWER(NEW.artist_slug)
    LIMIT 1;

    IF v_creator_uid IS NULL THEN
      RETURN NEW; -- no matching creator profile for this slug
    END IF;

    -- Dedupe: one notification per inquiry row.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_creator_uid
        AND type = 'booking_inquiry'
        AND reference_id = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (
      v_creator_uid,
      'booking_inquiry',
      'New Booking Inquiry 📅',
      'New booking inquiry from ' || NEW.contact_name ||
        COALESCE(' — ' || NULLIF(TRIM(NEW.event_city), ''), '') ||
        COALESCE(' (' || NULLIF(TRIM(NEW.event_type), '') || ')', ''),
      NEW.id::text,
      '/admin/booking-inquiries'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_booking_inquiry failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.public_booking_inquiries') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_booking_inquiry ON public.public_booking_inquiries;
    CREATE TRIGGER trg_notify_booking_inquiry
      AFTER INSERT ON public.public_booking_inquiries
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_booking_inquiry();
  ELSE
    RAISE NOTICE '[notification_engine] public.public_booking_inquiries missing — trigger skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. affiliate_conversions INSERT -> (referring user) "New referral conversion
--    (pending)". Signup conversions dedupe per referred user (endpoint retries
--    can double-insert); purchase conversions are each a distinct event.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_affiliate_conversion()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.referring_user_id IS NULL OR NEW.referring_user_id = NEW.referred_user_id THEN
      RETURN NEW;
    END IF;
    IF NEW.conversion_type = 'click' THEN
      RETURN NEW; -- clicks are counters, not conversions
    END IF;
    -- Dedupe: a referred user only signs up once; guard against endpoint retries.
    IF NEW.conversion_type = 'signup' AND EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.referring_user_id
        AND type = 'affiliate_conversion'
        AND actor_id = NEW.referred_user_id
        AND message LIKE '%signup%'
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      NEW.referring_user_id,
      'affiliate_conversion',
      'New Referral Conversion 🔗',
      'You have a new ' || NEW.conversion_type || ' referral conversion (pending approval)',
      NEW.referred_user_id,
      NEW.id::text,
      '/affiliates'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_affiliate_conversion failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.affiliate_conversions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_affiliate_conversion ON public.affiliate_conversions;
    CREATE TRIGGER trg_notify_affiliate_conversion
      AFTER INSERT ON public.affiliate_conversions
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_affiliate_conversion();
  ELSE
    RAISE NOTICE '[notification_engine] public.affiliate_conversions missing — trigger skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7a. campaign_applications INSERT -> (brand/campaign owner) "New brand deal
--     application". campaign_applications.creator_id stores profiles.id, so
--     names resolve via profiles.id and recipients via brand_profiles.user_id.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_brand_application()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_brand_uid      UUID;
  v_campaign_title TEXT;
  v_creator_name   TEXT;
BEGIN
  BEGIN
    SELECT bp.user_id, bc.title INTO v_brand_uid, v_campaign_title
    FROM public.brand_campaigns bc
    JOIN public.brand_profiles bp ON bp.id = bc.brand_id
    WHERE bc.id = NEW.campaign_id;

    IF v_brand_uid IS NULL THEN
      RETURN NEW;
    END IF;

    -- Dedupe: one notification per application row.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_brand_uid
        AND type = 'brand_application'
        AND reference_id = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;

    -- creator_id is a profiles.id; fall back to user_id match for safety.
    SELECT COALESCE(display_name, username, 'A creator') INTO v_creator_name
    FROM public.profiles WHERE id = NEW.creator_id OR user_id = NEW.creator_id
    LIMIT 1;

    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (
      v_brand_uid,
      'brand_application',
      'New Brand Deal Application 💼',
      COALESCE(v_creator_name, 'A creator') || ' applied to "' || COALESCE(v_campaign_title, 'your campaign') || '"',
      NEW.id::text,
      '/marketplace'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_brand_application failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7b. campaign_applications status -> 'accepted' -> (applicant creator)
--     "Your brand deal application was accepted".
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_brand_application_accepted()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_creator_uid    UUID;
  v_campaign_title TEXT;
BEGIN
  BEGIN
    IF NEW.status IS DISTINCT FROM 'accepted' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;

    -- creator_id is a profiles.id; fall back to user_id match for safety.
    SELECT user_id INTO v_creator_uid
    FROM public.profiles WHERE id = NEW.creator_id OR user_id = NEW.creator_id
    LIMIT 1;

    IF v_creator_uid IS NULL THEN
      RETURN NEW;
    END IF;

    -- Dedupe: status flip-flops (accepted -> pending -> accepted) fire once.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_creator_uid
        AND type = 'brand_application_accepted'
        AND reference_id = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;

    SELECT title INTO v_campaign_title FROM public.brand_campaigns WHERE id = NEW.campaign_id;

    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (
      v_creator_uid,
      'brand_application_accepted',
      'Brand Deal Accepted! 🎉',
      'Your application for "' || COALESCE(v_campaign_title, 'a brand campaign') || '" was accepted',
      NEW.id::text,
      '/marketplace'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_brand_application_accepted failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.campaign_applications') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_brand_application ON public.campaign_applications;
    CREATE TRIGGER trg_notify_brand_application
      AFTER INSERT ON public.campaign_applications
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_brand_application();

    DROP TRIGGER IF EXISTS trg_notify_brand_application_accepted ON public.campaign_applications;
    CREATE TRIGGER trg_notify_brand_application_accepted
      AFTER UPDATE OF status ON public.campaign_applications
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_brand_application_accepted();
  ELSE
    RAISE NOTICE '[notification_engine] public.campaign_applications missing — triggers skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. job_messages INSERT -> (other conversation party) "New message".
--    No notification row existed for these (only a polled unread badge).
--    Burst-collapse dedupe: while an UNREAD "new_message" notification for the
--    same conversation exists, further messages don't add more rows.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_job_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_recipient   UUID;
  v_sender_name TEXT;
BEGIN
  BEGIN
    SELECT CASE WHEN jc.creator_id = NEW.sender_id THEN jc.applicant_id ELSE jc.creator_id END
      INTO v_recipient
    FROM public.job_conversations jc
    WHERE jc.id = NEW.conversation_id;

    IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN
      RETURN NEW;
    END IF;

    -- Burst collapse: don't stack unread message notifications per conversation.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_recipient
        AND type = 'new_message'
        AND reference_id = NEW.conversation_id::text
        AND read = false
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
    FROM public.profiles WHERE user_id = NEW.sender_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      v_recipient,
      'new_message',
      'New Message 💬',
      COALESCE(v_sender_name, 'Someone') || ': ' || LEFT(NEW.content, 100),
      NEW.sender_id,
      NEW.conversation_id::text,
      '/messages'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_job_message failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.job_messages') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_job_message ON public.job_messages;
    CREATE TRIGGER trg_notify_job_message
      AFTER INSERT ON public.job_messages
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_job_message();
  ELSE
    RAISE NOTICE '[notification_engine] public.job_messages missing — trigger skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. deal_messages INSERT -> (other brand-deal party) "New deal message".
--    deal_messages.sender_id and brand_deals.creator_id store profiles.id;
--    brand recipients resolve via brand_profiles.user_id. Burst-collapse
--    dedupe per deal, same as job messages.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_deal_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_creator_profile UUID;
  v_brand_id        UUID;
  v_creator_uid     UUID;
  v_brand_uid       UUID;
  v_sender_uid      UUID;
  v_recipient       UUID;
  v_sender_name     TEXT;
BEGIN
  BEGIN
    SELECT bd.creator_id, bd.brand_id INTO v_creator_profile, v_brand_id
    FROM public.brand_deals bd WHERE bd.id = NEW.deal_id;

    IF v_creator_profile IS NULL AND v_brand_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT user_id INTO v_creator_uid
    FROM public.profiles WHERE id = v_creator_profile OR user_id = v_creator_profile
    LIMIT 1;
    SELECT user_id INTO v_brand_uid FROM public.brand_profiles WHERE id = v_brand_id;

    SELECT COALESCE(
      (SELECT user_id FROM public.profiles WHERE id = NEW.sender_id LIMIT 1),
      NEW.sender_id
    ) INTO v_sender_uid;

    v_recipient := CASE WHEN v_sender_uid = v_creator_uid THEN v_brand_uid ELSE v_creator_uid END;

    IF v_recipient IS NULL OR v_recipient = v_sender_uid THEN
      RETURN NEW;
    END IF;

    -- Burst collapse per deal.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_recipient
        AND type = 'deal_message'
        AND reference_id = NEW.deal_id::text
        AND read = false
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
    FROM public.profiles WHERE user_id = v_sender_uid;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (
      v_recipient,
      'deal_message',
      'New Deal Message 💬',
      COALESCE(v_sender_name, 'Someone') || ': ' || LEFT(NEW.message, 100),
      v_sender_uid,
      NEW.deal_id::text,
      '/marketplace/deal/' || NEW.deal_id::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_deal_message failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.deal_messages') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_deal_message ON public.deal_messages;
    CREATE TRIGGER trg_notify_deal_message
      AFTER INSERT ON public.deal_messages
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_deal_message();
  ELSE
    RAISE NOTICE '[notification_engine] public.deal_messages missing — trigger skipped';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Harden the EXISTING community engagement triggers (20260311163513):
--     • community_post_likes: add per liker+post dedupe (unlike/re-like spam)
--       and the never-block exception guard.
--     • community_comments: add the never-block exception guard.
--     Trigger bindings are unchanged; only the function bodies are replaced.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_community_like()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_liker_name TEXT;
BEGIN
  BEGIN
    SELECT author_id, title INTO v_post_author_id, v_post_title
    FROM public.community_posts WHERE id = NEW.post_id;

    IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
      RETURN NEW;
    END IF;

    -- Dedupe per liker+post: unlike/re-like cycles notify only once.
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_post_author_id
        AND type = 'community_like'
        AND actor_id = NEW.user_id
        AND reference_id = NEW.post_id::text
    ) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
    FROM public.profiles WHERE user_id = NEW.user_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
    VALUES (
      v_post_author_id,
      'community_like',
      'Post Liked',
      COALESCE(v_liker_name, 'Someone') || ' liked your post "' || COALESCE(LEFT(v_post_title, 50), 'your post') || '"',
      NEW.user_id,
      NEW.post_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_community_like failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_community_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_commenter_name TEXT;
BEGIN
  BEGIN
    SELECT author_id, title INTO v_post_author_id, v_post_title
    FROM public.community_posts WHERE id = NEW.post_id;

    IF v_post_author_id IS NULL OR v_post_author_id = NEW.author_id THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, 'Someone') INTO v_commenter_name
    FROM public.profiles WHERE user_id = NEW.author_id;

    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
    VALUES (
      v_post_author_id,
      'community_comment',
      'New Comment',
      COALESCE(v_commenter_name, 'Someone') || ' commented on your post "' || COALESCE(LEFT(v_post_title, 50), 'your post') || '"',
      NEW.author_id,
      NEW.post_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_community_comment failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOT COVERED (deliberate):
--   • classroom_lessons INSERT — mass fan-out to every member needs digest/push
--     infra; one notification row per member per lesson would melt the table.
--   • community_members INSERT, follows INSERT, community comment/like INSERTs,
--     tips — already live via 20260311163513 (member_joined, new_follower,
--     community_comment, community_like, tip_received).
--   • Cart/product/ticket/subscription Stripe flows — already notified
--     app-level by stripe-webhook / finalize-cart-order / finalize-ticket-order
--     (this migration only fills the non-Stripe / tier-ticket creator gaps).
-- ═══════════════════════════════════════════════════════════════════════════
