-- ============ 20260706130000_platform_dunning.sql ============
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.dunning_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id text NOT NULL,
  touch_number integer NOT NULL CHECK (touch_number BETWEEN 1 AND 3),
  user_id uuid,
  customer_email text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, touch_number)
);
GRANT ALL ON public.dunning_notices TO service_role;
ALTER TABLE public.dunning_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dunning_notices FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;

DO $$ BEGIN PERFORM cron.unschedule('platform-dunning-check-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('platform-dunning-check-daily', '0 15 * * *', $CRON$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/platform-dunning-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dunning-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'PLATFORM_DUNNING_CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
$CRON$);

-- ============ 20260706133000_server_side_points.sql ============
DROP POLICY IF EXISTS "System can insert points" ON public.member_points;
ALTER TABLE public.member_points ADD COLUMN IF NOT EXISTS source_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS member_points_user_action_source_key
  ON public.member_points (user_id, action_type, source_id);

CREATE OR REPLACE FUNCTION public.award_points_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
  VALUES (NEW.author_id, NEW.creator_id, 'post', 5, NEW.id)
  ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS award_points_on_post ON public.community_posts;
CREATE TRIGGER award_points_on_post AFTER INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_post();

CREATE OR REPLACE FUNCTION public.award_points_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.community_posts WHERE id = NEW.post_id;
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
    VALUES (NEW.author_id, v_creator_id, 'comment', 2, NEW.id)
    ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS award_points_on_comment ON public.community_comments;
CREATE TRIGGER award_points_on_comment AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_comment();

CREATE OR REPLACE FUNCTION public.award_points_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.community_posts WHERE id = NEW.post_id;
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
    VALUES (NEW.user_id, v_creator_id, 'like_received', 1, NEW.post_id)
    ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS award_points_on_like ON public.community_post_likes;
CREATE TRIGGER award_points_on_like AFTER INSERT ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_like();

CREATE OR REPLACE FUNCTION public.award_points_on_lesson_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.classroom_lessons WHERE id = NEW.lesson_id;
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
    VALUES (NEW.user_id, v_creator_id, 'lesson_complete', 10, NEW.lesson_id)
    ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS award_points_on_lesson_completion ON public.lesson_completions;
CREATE TRIGGER award_points_on_lesson_completion AFTER INSERT ON public.lesson_completions
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_lesson_completion();

-- ============ 20260706150000_notification_engine.sql ============
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_ref
  ON public.notifications (user_id, type, reference_id);

CREATE OR REPLACE FUNCTION public.notify_on_email_subscriber()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  BEGIN
    IF COALESCE(NEW.source, '') = 'membership' THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = NEW.creator_id AND type = 'email_subscriber' AND reference_id = NEW.email)
    THEN RETURN NEW; END IF;
    v_name := COALESCE(NULLIF(TRIM(NEW.name), ''), NEW.email);
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (NEW.creator_id, 'email_subscriber', 'New Email Subscriber',
      v_name || ' subscribed to your email list', NEW.email, '/dashboard/subscribers');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_email_subscriber failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.subscribers') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_email_subscriber ON public.subscribers;
  CREATE TRIGGER trg_notify_email_subscriber AFTER INSERT ON public.subscribers
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_email_subscriber();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_paid_member()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member_name TEXT;
BEGIN
  BEGIN
    IF NEW.status NOT IN ('active', 'trialing') THEN RETURN NEW; END IF;
    IF NEW.member_id = NEW.creator_id THEN RETURN NEW; END IF;
    IF NEW.stripe_subscription_id IS NOT NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = NEW.creator_id AND type IN ('new_paid_member', 'new_subscriber')
      AND actor_id = NEW.member_id) THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, username, 'Someone') INTO v_member_name
    FROM public.profiles WHERE user_id = NEW.member_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (NEW.creator_id, 'new_paid_member', 'New Member! 🎉',
      COALESCE(v_member_name, 'Someone') || ' became a ' ||
        CASE WHEN NEW.status = 'trialing' THEN 'trial' ELSE 'paid' END ||
        ' member of your community',
      NEW.member_id, NEW.id::text, '/dashboard');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_paid_member failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.member_subscriptions') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_paid_member ON public.member_subscriptions;
  CREATE TRIGGER trg_notify_paid_member AFTER INSERT ON public.member_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_paid_member();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_product_sale()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_buyer_name TEXT; v_product_name TEXT;
BEGIN
  BEGIN
    IF NEW.buyer_id = NEW.creator_id THEN RETURN NEW; END IF;
    IF NEW.stripe_payment_intent_id IS NOT NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = NEW.creator_id AND type = 'sale'
        AND reference_id = NEW.product_id::text AND actor_id = NEW.buyer_id)
    THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, username, 'Someone') INTO v_buyer_name
    FROM public.profiles WHERE user_id = NEW.buyer_id;
    SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (NEW.creator_id, 'sale', 'New Sale! 🎉',
      COALESCE(v_buyer_name, 'Someone') || ' purchased "' || COALESCE(v_product_name, 'a product') || '"' ||
        CASE WHEN COALESCE(NEW.amount, 0) > 0 THEN ' for $' || TRIM(TO_CHAR(NEW.amount, 'FM999999990.00')) ELSE '' END,
      NEW.buyer_id, NEW.product_id::text, '/wallet');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_product_sale failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.product_purchases') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_product_sale ON public.product_purchases;
  CREATE TRIGGER trg_notify_product_sale AFTER INSERT ON public.product_purchases
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_product_sale();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_ticket_sold()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_buyer_name TEXT; v_event_title TEXT;
BEGIN
  BEGIN
    IF NEW.status <> 'active' THEN RETURN NEW; END IF;
    IF NEW.buyer_id = NEW.creator_id THEN RETURN NEW; END IF;
    IF NEW.order_id IS NULL AND NEW.tier_id IS NULL AND NEW.stripe_payment_intent_id IS NOT NULL
      THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = NEW.creator_id AND type = 'ticket_sold' AND reference_id = NEW.id::text)
    THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, username, 'Someone') INTO v_buyer_name
    FROM public.profiles WHERE user_id = NEW.buyer_id;
    SELECT title INTO v_event_title FROM public.events WHERE id = NEW.event_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (NEW.creator_id, 'ticket_sold', 'Ticket Sold! 🎟️',
      COALESCE(v_buyer_name, 'Someone') || ' bought a ticket to "' || COALESCE(v_event_title, 'your event') || '"',
      NEW.buyer_id, NEW.id::text, '/events');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_ticket_sold failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.tickets') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_ticket_sold ON public.tickets;
  CREATE TRIGGER trg_notify_ticket_sold AFTER INSERT ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_sold();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_booking_inquiry()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator_uid UUID;
BEGIN
  BEGIN
    SELECT user_id INTO v_creator_uid FROM public.profiles
    WHERE LOWER(username) = LOWER(NEW.artist_slug) LIMIT 1;
    IF v_creator_uid IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = v_creator_uid AND type = 'booking_inquiry' AND reference_id = NEW.id::text)
    THEN RETURN NEW; END IF;
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (v_creator_uid, 'booking_inquiry', 'New Booking Inquiry 📅',
      'New booking inquiry from ' || NEW.contact_name ||
        COALESCE(' — ' || NULLIF(TRIM(NEW.event_city), ''), '') ||
        COALESCE(' (' || NULLIF(TRIM(NEW.event_type), '') || ')', ''),
      NEW.id::text, '/admin/booking-inquiries');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_booking_inquiry failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.public_booking_inquiries') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_booking_inquiry ON public.public_booking_inquiries;
  CREATE TRIGGER trg_notify_booking_inquiry AFTER INSERT ON public.public_booking_inquiries
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_booking_inquiry();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_affiliate_conversion()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF NEW.referring_user_id IS NULL OR NEW.referring_user_id = NEW.referred_user_id
      THEN RETURN NEW; END IF;
    IF NEW.conversion_type = 'click' THEN RETURN NEW; END IF;
    IF NEW.conversion_type = 'signup' AND EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = NEW.referring_user_id AND type = 'affiliate_conversion'
        AND actor_id = NEW.referred_user_id AND message LIKE '%signup%')
    THEN RETURN NEW; END IF;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (NEW.referring_user_id, 'affiliate_conversion', 'New Referral Conversion 🔗',
      'You have a new ' || NEW.conversion_type || ' referral conversion (pending approval)',
      NEW.referred_user_id, NEW.id::text, '/affiliates');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_affiliate_conversion failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.affiliate_conversions') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_affiliate_conversion ON public.affiliate_conversions;
  CREATE TRIGGER trg_notify_affiliate_conversion AFTER INSERT ON public.affiliate_conversions
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_affiliate_conversion();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_brand_application()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_brand_uid UUID; v_campaign_title TEXT; v_creator_name TEXT;
BEGIN
  BEGIN
    SELECT bp.user_id, bc.title INTO v_brand_uid, v_campaign_title
    FROM public.brand_campaigns bc
    JOIN public.brand_profiles bp ON bp.id = bc.brand_id
    WHERE bc.id = NEW.campaign_id;
    IF v_brand_uid IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = v_brand_uid AND type = 'brand_application' AND reference_id = NEW.id::text)
    THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, username, 'A creator') INTO v_creator_name
    FROM public.profiles WHERE id = NEW.creator_id OR user_id = NEW.creator_id LIMIT 1;
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (v_brand_uid, 'brand_application', 'New Brand Deal Application 💼',
      COALESCE(v_creator_name, 'A creator') || ' applied to "' || COALESCE(v_campaign_title, 'your campaign') || '"',
      NEW.id::text, '/marketplace');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_brand_application failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_brand_application_accepted()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator_uid UUID; v_campaign_title TEXT;
BEGIN
  BEGIN
    IF NEW.status IS DISTINCT FROM 'accepted' OR OLD.status IS NOT DISTINCT FROM NEW.status
      THEN RETURN NEW; END IF;
    SELECT user_id INTO v_creator_uid
    FROM public.profiles WHERE id = NEW.creator_id OR user_id = NEW.creator_id LIMIT 1;
    IF v_creator_uid IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = v_creator_uid AND type = 'brand_application_accepted' AND reference_id = NEW.id::text)
    THEN RETURN NEW; END IF;
    SELECT title INTO v_campaign_title FROM public.brand_campaigns WHERE id = NEW.campaign_id;
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, link)
    VALUES (v_creator_uid, 'brand_application_accepted', 'Brand Deal Accepted! 🎉',
      'Your application for "' || COALESCE(v_campaign_title, 'a brand campaign') || '" was accepted',
      NEW.id::text, '/marketplace');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_brand_application_accepted failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.campaign_applications') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_brand_application ON public.campaign_applications;
  CREATE TRIGGER trg_notify_brand_application AFTER INSERT ON public.campaign_applications
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_brand_application();
  DROP TRIGGER IF EXISTS trg_notify_brand_application_accepted ON public.campaign_applications;
  CREATE TRIGGER trg_notify_brand_application_accepted AFTER UPDATE OF status ON public.campaign_applications
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_brand_application_accepted();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_job_message()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_recipient UUID; v_sender_name TEXT;
BEGIN
  BEGIN
    SELECT CASE WHEN jc.creator_id = NEW.sender_id THEN jc.applicant_id ELSE jc.creator_id END
      INTO v_recipient FROM public.job_conversations jc WHERE jc.id = NEW.conversation_id;
    IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = v_recipient AND type = 'new_message'
        AND reference_id = NEW.conversation_id::text AND read = false)
    THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
    FROM public.profiles WHERE user_id = NEW.sender_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (v_recipient, 'new_message', 'New Message 💬',
      COALESCE(v_sender_name, 'Someone') || ': ' || LEFT(NEW.content, 100),
      NEW.sender_id, NEW.conversation_id::text, '/messages');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_job_message failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.job_messages') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_job_message ON public.job_messages;
  CREATE TRIGGER trg_notify_job_message AFTER INSERT ON public.job_messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_job_message();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_deal_message()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator_profile UUID; v_brand_id UUID; v_creator_uid UUID; v_brand_uid UUID;
        v_sender_uid UUID; v_recipient UUID; v_sender_name TEXT;
BEGIN
  BEGIN
    SELECT bd.creator_id, bd.brand_id INTO v_creator_profile, v_brand_id
    FROM public.brand_deals bd WHERE bd.id = NEW.deal_id;
    IF v_creator_profile IS NULL AND v_brand_id IS NULL THEN RETURN NEW; END IF;
    SELECT user_id INTO v_creator_uid FROM public.profiles
    WHERE id = v_creator_profile OR user_id = v_creator_profile LIMIT 1;
    SELECT user_id INTO v_brand_uid FROM public.brand_profiles WHERE id = v_brand_id;
    SELECT COALESCE((SELECT user_id FROM public.profiles WHERE id = NEW.sender_id LIMIT 1), NEW.sender_id)
      INTO v_sender_uid;
    v_recipient := CASE WHEN v_sender_uid = v_creator_uid THEN v_brand_uid ELSE v_creator_uid END;
    IF v_recipient IS NULL OR v_recipient = v_sender_uid THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = v_recipient AND type = 'deal_message'
        AND reference_id = NEW.deal_id::text AND read = false)
    THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
    FROM public.profiles WHERE user_id = v_sender_uid;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id, link)
    VALUES (v_recipient, 'deal_message', 'New Deal Message 💬',
      COALESCE(v_sender_name, 'Someone') || ': ' || LEFT(NEW.message, 100),
      v_sender_uid, NEW.deal_id::text, '/marketplace/deal/' || NEW.deal_id::text);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_deal_message failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DO $$ BEGIN IF to_regclass('public.deal_messages') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_notify_deal_message ON public.deal_messages;
  CREATE TRIGGER trg_notify_deal_message AFTER INSERT ON public.deal_messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_deal_message();
END IF; END $$;

CREATE OR REPLACE FUNCTION public.notify_on_community_like()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post_author_id UUID; v_post_title TEXT; v_liker_name TEXT;
BEGIN
  BEGIN
    SELECT author_id, title INTO v_post_author_id, v_post_title
    FROM public.community_posts WHERE id = NEW.post_id;
    IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.notifications
      WHERE user_id = v_post_author_id AND type = 'community_like'
        AND actor_id = NEW.user_id AND reference_id = NEW.post_id::text)
    THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, 'Someone') INTO v_liker_name
    FROM public.profiles WHERE user_id = NEW.user_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
    VALUES (v_post_author_id, 'community_like', 'Post Liked',
      COALESCE(v_liker_name, 'Someone') || ' liked your post "' || COALESCE(LEFT(v_post_title, 50), 'your post') || '"',
      NEW.user_id, NEW.post_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_community_like failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_community_comment()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post_author_id UUID; v_post_title TEXT; v_commenter_name TEXT;
BEGIN
  BEGIN
    SELECT author_id, title INTO v_post_author_id, v_post_title
    FROM public.community_posts WHERE id = NEW.post_id;
    IF v_post_author_id IS NULL OR v_post_author_id = NEW.author_id THEN RETURN NEW; END IF;
    SELECT COALESCE(display_name, 'Someone') INTO v_commenter_name
    FROM public.profiles WHERE user_id = NEW.author_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
    VALUES (v_post_author_id, 'community_comment', 'New Comment',
      COALESCE(v_commenter_name, 'Someone') || ' commented on your post "' || COALESCE(LEFT(v_post_title, 50), 'your post') || '"',
      NEW.author_id, NEW.post_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notification_engine] notify_on_community_comment failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;