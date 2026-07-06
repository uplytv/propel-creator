-- ============ 20260706090000_creator_crm.sql ============
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL,
  name text,
  phone text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('member','subscriber','buyer','ticket','booking','manual')),
  tags text[] NOT NULL DEFAULT '{}',
  stage text NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead','engaged','customer','vip')),
  notes_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, email)
);
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('note','task','call','email')),
  body text NOT NULL,
  due_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_creator_activity
  ON public.crm_contacts (creator_id, last_activity_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_creator_stage
  ON public.crm_contacts (creator_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact
  ON public.crm_activities (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_creator
  ON public.crm_activities (creator_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own crm contacts"
  ON public.crm_contacts FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators manage own crm activities"
  ON public.crm_activities FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE OR REPLACE FUNCTION public.crm_contacts_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_crm_contacts_updated_at ON public.crm_contacts;
CREATE TRIGGER trg_crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_contacts_touch_updated_at();

CREATE OR REPLACE FUNCTION public.crm_activities_touch_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.crm_contacts
       SET notes_count = notes_count + 1,
           last_activity_at = GREATEST(COALESCE(last_activity_at, NEW.created_at), NEW.created_at)
     WHERE id = NEW.contact_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.crm_contacts SET notes_count = GREATEST(notes_count - 1, 0) WHERE id = OLD.contact_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_crm_activities_touch_contact ON public.crm_activities;
CREATE TRIGGER trg_crm_activities_touch_contact
  AFTER INSERT OR DELETE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.crm_activities_touch_contact();

CREATE OR REPLACE FUNCTION public.crm_sync_contacts(p_creator_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total integer := 0; v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_creator_id THEN RAISE EXCEPTION 'not allowed'; END IF;

  INSERT INTO public.crm_contacts (creator_id, user_id, email, name, source, last_activity_at)
  SELECT p_creator_id, m.user_id, lower(au.email),
    COALESCE(NULLIF(btrim(pr.display_name), ''), NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.username),
    'member', m.last_at
  FROM (
    SELECT user_id, MAX(last_at) AS last_at FROM (
      SELECT cm.user_id, cm.joined_at AS last_at FROM public.community_members cm WHERE cm.creator_id = p_creator_id
      UNION ALL
      SELECT ms.member_id, GREATEST(ms.created_at, COALESCE(ms.current_period_start, ms.created_at))
      FROM public.member_subscriptions ms WHERE ms.creator_id = p_creator_id
    ) src GROUP BY user_id
  ) m
  JOIN auth.users au ON au.id = m.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = m.user_id
  WHERE au.email IS NOT NULL
  ON CONFLICT (creator_id, email) DO UPDATE SET
    user_id = COALESCE(public.crm_contacts.user_id, EXCLUDED.user_id),
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at), COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at));
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  INSERT INTO public.crm_contacts (creator_id, email, name, source, last_activity_at)
  SELECT DISTINCT ON (lower(s.email)) p_creator_id, lower(s.email), NULLIF(btrim(s.name), ''), 'subscriber',
    GREATEST(s.created_at, COALESCE(s.last_seen_at, s.created_at), COALESCE(s.last_open_at, s.created_at), COALESCE(s.last_click_at, s.created_at))
  FROM public.subscribers s
  WHERE s.creator_id = p_creator_id AND s.email IS NOT NULL AND btrim(s.email) <> ''
  ORDER BY lower(s.email), s.created_at DESC
  ON CONFLICT (creator_id, email) DO UPDATE SET
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at), COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at));
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  INSERT INTO public.crm_contacts (creator_id, user_id, email, name, source, last_activity_at)
  SELECT p_creator_id, b.buyer_id, lower(au.email),
    COALESCE(NULLIF(btrim(pr.display_name), ''), NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.username),
    'buyer', b.last_at
  FROM (SELECT pp.buyer_id, MAX(pp.created_at) AS last_at FROM public.product_purchases pp
        WHERE pp.creator_id = p_creator_id AND pp.status = 'completed' GROUP BY pp.buyer_id) b
  JOIN auth.users au ON au.id = b.buyer_id
  LEFT JOIN public.profiles pr ON pr.user_id = b.buyer_id
  WHERE au.email IS NOT NULL
  ON CONFLICT (creator_id, email) DO UPDATE SET
    user_id = COALESCE(public.crm_contacts.user_id, EXCLUDED.user_id),
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at), COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at));
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  INSERT INTO public.crm_contacts (creator_id, user_id, email, name, source, last_activity_at)
  SELECT p_creator_id, t.buyer_id, lower(au.email),
    COALESCE(NULLIF(btrim(pr.display_name), ''), NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.username),
    'ticket', t.last_at
  FROM (SELECT tk.buyer_id, MAX(tk.created_at) AS last_at FROM public.tickets tk
        WHERE tk.creator_id = p_creator_id AND tk.status <> 'refunded' GROUP BY tk.buyer_id) t
  JOIN auth.users au ON au.id = t.buyer_id
  LEFT JOIN public.profiles pr ON pr.user_id = t.buyer_id
  WHERE au.email IS NOT NULL
  ON CONFLICT (creator_id, email) DO UPDATE SET
    user_id = COALESCE(public.crm_contacts.user_id, EXCLUDED.user_id),
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at), COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at));
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  INSERT INTO public.crm_contacts (creator_id, email, name, source, last_activity_at)
  SELECT DISTINCT ON (lower(bi.contact_email)) p_creator_id, lower(bi.contact_email),
    NULLIF(btrim(bi.contact_name), ''), 'booking', bi.created_at
  FROM public.public_booking_inquiries bi
  JOIN public.profiles pr ON pr.user_id = p_creator_id AND pr.username IS NOT NULL AND lower(pr.username) = lower(bi.artist_slug)
  WHERE bi.contact_email IS NOT NULL AND btrim(bi.contact_email) <> ''
  ORDER BY lower(bi.contact_email), bi.created_at DESC
  ON CONFLICT (creator_id, email) DO UPDATE SET
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at), COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at));
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RETURN v_total;
END; $$;
REVOKE ALL ON FUNCTION public.crm_sync_contacts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_sync_contacts(uuid) TO authenticated;

-- ============ 20260706093000_ad_campaigns.sql ============
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('google', 'facebook', 'instagram')),
  objective text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published', 'paused', 'archived')),
  budget_daily_cents int,
  headline text,
  primary_text text,
  cta text,
  audience jsonb,
  creative_url text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_campaigns_creator ON public.ad_campaigns (creator_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own ad campaigns"
  ON public.ad_campaigns FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE TRIGGER update_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 20260706110000_cart_orders.sql ============
CREATE TABLE IF NOT EXISTS public.cart_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_cart_orders_buyer ON public.cart_orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_orders_status ON public.cart_orders(status) WHERE status <> 'completed';
GRANT SELECT ON public.cart_orders TO authenticated;
GRANT ALL ON public.cart_orders TO service_role;
ALTER TABLE public.cart_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own cart orders" ON public.cart_orders
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Service role full access cart orders" ON public.cart_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ 20260706120000_automation_heartbeat.sql ============
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'email_queue_service_role_key') THEN
    RAISE WARNING 'Vault secret email_queue_service_role_key is missing.';
  END IF;
END $$;

DO $$ BEGIN PERFORM cron.unschedule('process-email-queue'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('process-email-queue', '5 seconds', $CRON$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  )
  WHERE NOT EXISTS (SELECT 1 FROM public.email_send_state WHERE retry_after_until IS NOT NULL AND retry_after_until > now())
  AND (EXISTS (SELECT 1 FROM pgmq.q_auth_emails) OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails));
$CRON$);

DO $$ BEGIN PERFORM cron.unschedule('process-scheduled-broadcasts'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('process-scheduled-broadcasts', '*/5 * * * *', $CRON$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/process-scheduled-broadcasts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
$CRON$);

DO $$ BEGIN PERFORM cron.unschedule('process-drip-sequences'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('process-drip-sequences', '*/15 * * * *', $CRON$
  SELECT net.http_post(
    url := 'https://dbjlhmbgskvhuzqvqfrl.functions.supabase.co/process-drip-sequences',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
$CRON$);

CREATE OR REPLACE FUNCTION public.enroll_subscriber_in_drip_sequences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.unsubscribed THEN RETURN NEW; END IF;
  BEGIN
    INSERT INTO public.drip_sequence_enrollments (sequence_id, subscriber_email)
    SELECT ds.id, NEW.email FROM public.drip_sequences ds
    WHERE ds.creator_id = NEW.creator_id AND ds.status = 'active'
      AND ds.trigger_event = CASE WHEN NEW.source = 'rsvp' THEN 'rsvp' ELSE 'new_subscriber' END
    ON CONFLICT (sequence_id, subscriber_email) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'drip auto-enrollment failed for % (creator %): %', NEW.email, NEW.creator_id, SQLERRM;
  END;
  RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.enroll_subscriber_in_drip_sequences() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_enroll_subscriber_in_drip_sequences ON public.subscribers;
CREATE TRIGGER trg_enroll_subscriber_in_drip_sequences
  AFTER INSERT ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.enroll_subscriber_in_drip_sequences();