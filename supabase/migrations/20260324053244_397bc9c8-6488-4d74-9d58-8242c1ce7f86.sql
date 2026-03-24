
-- Admin notification config table
CREATE TABLE IF NOT EXISTS admin_notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  event_type text NOT NULL,
  in_app_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  push_enabled boolean DEFAULT false,
  min_amount numeric DEFAULT 0,
  batch_window_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, event_type)
);

ALTER TABLE admin_notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own notification config" ON admin_notification_config
  FOR ALL TO authenticated
  USING (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

-- Admin notification batch table
CREATE TABLE IF NOT EXISTS admin_notification_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_count integer DEFAULT 1,
  first_event_at timestamptz DEFAULT now(),
  last_event_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  dispatched boolean DEFAULT false
);

ALTER TABLE admin_notification_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to batch table" ON admin_notification_batch
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for tables not already in publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notification_batch;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_spaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tip_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stripe_webhook_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_stripe_accounts;

-- SECURITY DEFINER function to insert admin notifications (bypasses RLS)
CREATE OR REPLACE FUNCTION public.insert_admin_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT '/admin',
  p_reference_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, reference_id, read)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_reference_id, false);
END;
$$;

-- Core notify_admin function with batching and dedup
CREATE OR REPLACE FUNCTION public.notify_admin(
  p_title text,
  p_body text,
  p_type text,
  p_link text DEFAULT '/admin',
  p_metadata jsonb DEFAULT '{}',
  p_amount numeric DEFAULT 0,
  p_dedup_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  config_record RECORD;
  batch_record RECORD;
  batch_window integer;
  min_amount numeric;
BEGIN
  FOR admin_record IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    SELECT * INTO config_record
    FROM admin_notification_config
    WHERE admin_id = admin_record.user_id AND event_type = p_type
    LIMIT 1;
    
    batch_window := COALESCE(config_record.batch_window_seconds, 0);
    min_amount := COALESCE(config_record.min_amount, 0);
    
    IF p_amount < min_amount THEN CONTINUE; END IF;
    
    IF p_dedup_key IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = admin_record.user_id AND type = p_type
        AND message LIKE '%' || p_dedup_key || '%'
        AND created_at > now() - interval '1 hour'
      ) THEN CONTINUE; END IF;
    END IF;
    
    IF batch_window > 0 THEN
      SELECT * INTO batch_record
      FROM admin_notification_batch
      WHERE event_type = p_type AND dispatched = false
      AND first_event_at > now() - (batch_window || ' seconds')::interval
      LIMIT 1;
      
      IF batch_record IS NOT NULL THEN
        UPDATE admin_notification_batch
        SET event_count = event_count + 1, last_event_at = now(),
            metadata = jsonb_build_object('title', p_title, 'body', p_body) || p_metadata
        WHERE id = batch_record.id;
        CONTINUE;
      ELSE
        INSERT INTO admin_notification_batch (event_type, metadata)
        VALUES (p_type, jsonb_build_object('title', p_title, 'body', p_body) || p_metadata);
      END IF;
    END IF;
    
    IF COALESCE(config_record.in_app_enabled, true) THEN
      PERFORM insert_admin_notification(admin_record.user_id, p_type, p_title, p_body, p_link);
    END IF;
  END LOOP;
END;
$$;

-- Dispatch batched notifications
CREATE OR REPLACE FUNCTION public.dispatch_batched_admin_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch RECORD;
  admin_record RECORD;
BEGIN
  FOR batch IN
    SELECT * FROM admin_notification_batch
    WHERE dispatched = false AND last_event_at < now() - interval '2 minutes'
  LOOP
    FOR admin_record IN SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      PERFORM insert_admin_notification(
        admin_record.user_id, batch.event_type,
        CASE WHEN batch.event_count = 1 THEN COALESCE((batch.metadata->>'title')::text, batch.event_type)
             ELSE batch.event_count::text || ' new ' || replace(batch.event_type, 'admin_', '') || ' events' END,
        CASE WHEN batch.event_count = 1 THEN COALESCE((batch.metadata->>'body')::text, 'Event occurred')
             ELSE batch.event_count::text || ' events in the last 2 minutes' END,
        '/admin'
      );
    END LOOP;
    UPDATE admin_notification_batch SET dispatched = true WHERE id = batch.id;
  END LOOP;
END;
$$;

-- TRIGGERS

CREATE OR REPLACE FUNCTION public.trigger_admin_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM notify_admin('👤 New User: ' || COALESCE(NEW.display_name, 'Unknown'),
    COALESCE(NEW.display_name, 'Unknown') || ' (' || COALESCE(NEW.username, '') || ') just signed up',
    'admin_new_user', '/admin/users',
    jsonb_build_object('reference_id', NEW.user_id, 'username', NEW.username, 'creator_type', NEW.creator_type), 0);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_new_user AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_admin_new_user();

CREATE OR REPLACE FUNCTION public.trigger_admin_new_creator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM notify_admin('🎨 New Creator Space: ' || NEW.name,
    'A new community was just created', 'admin_new_creator', '/admin',
    jsonb_build_object('reference_id', NEW.id, 'creator_id', NEW.creator_id, 'space_name', NEW.name), 0);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_new_creator AFTER INSERT ON creator_spaces FOR EACH ROW EXECUTE FUNCTION trigger_admin_new_creator();

CREATE OR REPLACE FUNCTION public.trigger_admin_new_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM notify_admin('💰 New Paid Member', 'A creator just got a new paying subscriber',
    'admin_new_subscription', '/admin',
    jsonb_build_object('reference_id', NEW.id, 'creator_id', NEW.creator_id, 'tier_id', NEW.tier_id), 0);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_new_subscription AFTER INSERT ON member_subscriptions FOR EACH ROW EXECUTE FUNCTION trigger_admin_new_subscription();

CREATE OR REPLACE FUNCTION public.trigger_admin_subscription_canceled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'canceled' AND NEW.status = 'canceled' THEN
    PERFORM notify_admin('⚠️ Subscription Canceled', 'A member just canceled their subscription',
      'admin_subscription_canceled', '/admin',
      jsonb_build_object('creator_id', NEW.creator_id, 'member_id', NEW.member_id), 0);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_subscription_canceled AFTER UPDATE ON member_subscriptions FOR EACH ROW EXECUTE FUNCTION trigger_admin_subscription_canceled();

CREATE OR REPLACE FUNCTION public.trigger_admin_new_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.amount > 0 THEN
    PERFORM notify_admin('💸 Transaction: $' || NEW.amount::text,
      'Platform earned $' || COALESCE(NEW.platform_fee_amount, 0)::text || ' — Net: $' || COALESCE(NEW.net_amount, 0)::text,
      'admin_new_transaction', '/admin',
      jsonb_build_object('reference_id', NEW.id, 'amount', NEW.amount, 'platform_fee', NEW.platform_fee_amount, 'type', NEW.type),
      NEW.amount);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_new_transaction AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION trigger_admin_new_transaction();

CREATE OR REPLACE FUNCTION public.trigger_admin_new_waitlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM notify_admin('📋 New Waitlist: ' || COALESCE(NEW.full_name, 'Unknown'),
    COALESCE(NEW.full_name, 'Unknown') || ' applied — position #' || COALESCE(NEW.position, 0)::text || CASE WHEN NEW.referred_by IS NOT NULL THEN ' · Referred' ELSE ' · Organic' END,
    'admin_new_waitlist', '/admin',
    jsonb_build_object('reference_id', NEW.id, 'referred_by', NEW.referred_by, 'position', NEW.position), 0);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_new_waitlist AFTER INSERT ON waitlist FOR EACH ROW EXECUTE FUNCTION trigger_admin_new_waitlist();

CREATE OR REPLACE FUNCTION public.trigger_admin_stream_started()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'active' AND NEW.status = 'active' THEN
    PERFORM notify_admin('🔴 Stream Started: ' || COALESCE(NEW.title, 'Untitled Stream'),
      'A creator just went live on UPLY', 'admin_stream_started', '/admin',
      jsonb_build_object('reference_id', NEW.id, 'creator_id', NEW.user_id, 'title', NEW.title), 0);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_stream_started AFTER UPDATE ON mux_live_streams FOR EACH ROW EXECUTE FUNCTION trigger_admin_stream_started();

CREATE OR REPLACE FUNCTION public.trigger_admin_new_tip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM notify_admin('💝 Tip: $' || NEW.amount::text, 'A viewer just sent a tip',
    'admin_new_tip', '/admin',
    jsonb_build_object('reference_id', NEW.id, 'amount', NEW.amount, 'receiver_id', NEW.receiver_id), NEW.amount);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_new_tip AFTER INSERT ON tip_transactions FOR EACH ROW EXECUTE FUNCTION trigger_admin_new_tip();

CREATE OR REPLACE FUNCTION public.trigger_admin_ticket_sold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM notify_admin('🎫 Ticket Sold: $' || NEW.amount_paid::text,
    'Event ticket purchased — Creator earned $' || NEW.creator_earnings::text,
    'admin_ticket_sold', '/admin',
    jsonb_build_object('reference_id', NEW.id, 'amount', NEW.amount_paid, 'event_id', NEW.event_id), NEW.amount_paid);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_ticket_sold AFTER INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION trigger_admin_ticket_sold();

CREATE OR REPLACE FUNCTION public.trigger_admin_stripe_failure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'failed' THEN
    PERFORM notify_admin('🚨 Stripe Webhook Failed',
      'Event: ' || COALESCE(NEW.event_type, 'unknown') || ' — ' || COALESCE(NEW.error_message, 'Unknown error'),
      'admin_stripe_failure', '/admin',
      jsonb_build_object('event_type', NEW.event_type, 'error', NEW.error_message, 'stripe_event_id', NEW.stripe_event_id),
      0, NEW.stripe_event_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_stripe_failure AFTER INSERT ON stripe_webhook_log FOR EACH ROW EXECUTE FUNCTION trigger_admin_stripe_failure();

CREATE OR REPLACE FUNCTION public.trigger_admin_stripe_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.charges_enabled = false AND NEW.charges_enabled = true THEN
    PERFORM notify_admin('✅ Creator Stripe Verified',
      'A creator completed Stripe onboarding and can now accept payments',
      'admin_stripe_verified', '/admin', jsonb_build_object('creator_id', NEW.creator_id), 0);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_admin_stripe_verified AFTER UPDATE ON creator_stripe_accounts FOR EACH ROW EXECUTE FUNCTION trigger_admin_stripe_verified();
