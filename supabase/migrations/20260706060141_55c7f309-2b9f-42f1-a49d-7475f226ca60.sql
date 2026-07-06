-- ============ 20260706190000_rls_gaps.sql ============
DO $$ BEGIN
  IF to_regclass('public.boost_toast_events') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.boost_toast_events ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='boost_toast_events' AND policyname='Users insert own boost toast events') THEN
      EXECUTE $pol$CREATE POLICY "Users insert own boost toast events" ON public.boost_toast_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())$pol$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='boost_toast_events' AND policyname='Users and creators read own boost toast events') THEN
      EXECUTE $pol$CREATE POLICY "Users and creators read own boost toast events" ON public.boost_toast_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR creator_id = auth.uid())$pol$;
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.comment_reports') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comment_reports' AND policyname='Users file own comment reports') THEN
      EXECUTE $pol$CREATE POLICY "Users file own comment reports" ON public.comment_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid())$pol$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comment_reports' AND policyname='Users read own comment reports') THEN
      EXECUTE $pol$CREATE POLICY "Users read own comment reports" ON public.comment_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid())$pol$;
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.short_comments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.short_comments ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='short_comments' AND policyname='Anyone reads visible short comments') THEN
      EXECUTE $pol$CREATE POLICY "Anyone reads visible short comments" ON public.short_comments FOR SELECT USING (is_hidden = false OR user_id = auth.uid())$pol$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='short_comments' AND policyname='Users insert own short comments') THEN
      EXECUTE $pol$CREATE POLICY "Users insert own short comments" ON public.short_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())$pol$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='short_comments' AND policyname='Users update own short comments') THEN
      EXECUTE $pol$CREATE POLICY "Users update own short comments" ON public.short_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$pol$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='short_comments' AND policyname='Users delete own short comments') THEN
      EXECUTE $pol$CREATE POLICY "Users delete own short comments" ON public.short_comments FOR DELETE TO authenticated USING (user_id = auth.uid())$pol$;
    END IF;
  END IF;
END $$;

-- ============ 20260706191000_reserved_usernames.sql ============
CREATE OR REPLACE FUNCTION public.enforce_username_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE reserved text[] := ARRAY[
  'about','account','achievements','ad-integrations','ad_integrations','adintegrations','admin','ads','ads-manager','ads_manager','adsmanager',
  'affiliates','analytics','andy','andymusic','andymusic1','api','app','apply','aria','aria-command','aria_command','ariacommand',
  'arya','aryaxo','aryaxoblog','aryaxolinks','aryaxosite','assets','auth','bazi','billing','blake','blakethegreat','blog','bobby',
  'boost-cancel','boost-success','boost_cancel','boost_success','boostcancel','boostsuccess','buy','buy-credits','buy_credits','buycredits',
  'c','camera','collaborate','community','contact','content-library','content_library','contentlibrary','create','create-event','create_event','createevent',
  'creator','creator-affiliate','creator_affiliate','creatoraffiliate','crm','dashboard','developer','discover','distribution','docs','edge',
  'email-unsubscribe','email_unsubscribe','emailunsubscribe','embed','event','events','following','for-you','for_you','foryou',
  'founderoffers','founders','founderservices','functions','go-live','go_live','golive','graphql','grow','growth-reports','growth_reports','growthreports',
  'health','help','home','inbox','index','invite','invite-codes','invite_codes','invitecodes','job-messages','job_messages','jobmessages',
  'jobs','join','launchpad','leaderboard','legal','link','live','login','logout','mail','marketplace','messages',
  'morvarid','morvaridshahbazi','music','my-page','my-rep','my_page','my_rep','mypage','myrep','network','new','newsletter',
  'notifications','official','omid','omid_music','omidmusic','onboarding','p','pending-approval','pending_approval','pendingapproval',
  'playlist','playlists','podcast','podcast-rss','podcast_rss','podcastrss','post-job','post_job','postjob','ppv','presave','pricing','privacy',
  'products','purchases','radiate','realtime','ref','repurpose','reset-password','reset_password','resetpassword','rest','root','roster',
  'scan','search','security','settings','shop','shorts','signin','signup','site','smart-links','smart_links','smartlinks','social',
  'sonuha','space','staff','static','storage','stream','support','system','talent-profile','talent_profile','talentprofile','team',
  'terms','test','tickets','trending','tv','unsubscribe','upgrade','uply','uplytv','user','users','vs','waitlist','wallet','webhook','webhooks','www'
];
BEGIN
  IF NEW.username IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.username IS NOT DISTINCT FROM OLD.username THEN RETURN NEW; END IF;
  IF NEW.username !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters using only lowercase letters, numbers, and underscores.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF lower(NEW.username) = ANY (reserved) THEN
    RAISE EXCEPTION 'This username is reserved. Please choose another.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_username_rules ON public.profiles;
CREATE TRIGGER trg_enforce_username_rules
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_username_rules();

-- ============ 20260706192000_edge_rate_limit_cleanup.sql ============
DO $$ BEGIN PERFORM cron.unschedule('cleanup-edge-function-rate-limits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'cleanup-edge-function-rate-limits',
  '0 3 * * *',
  $$DELETE FROM public.edge_function_rate_limits WHERE updated_at < now() - interval '24 hours'$$
);

-- ============ 20260706200000_community_depth.sql ============
CREATE TABLE IF NOT EXISTS public.community_polls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL UNIQUE REFERENCES public.community_posts(id) ON DELETE CASCADE,
  options    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_polls_options_shape CHECK (
    jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6)
);
GRANT SELECT, INSERT, DELETE ON public.community_polls TO authenticated;
GRANT ALL ON public.community_polls TO service_role;
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View polls with post access" ON public.community_polls;
CREATE POLICY "View polls with post access" ON public.community_polls FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_polls.post_id
    AND (auth.uid() = p.author_id OR public.has_creator_access(p.creator_id))));
DROP POLICY IF EXISTS "Post authors can attach polls" ON public.community_polls;
CREATE POLICY "Post authors can attach polls" ON public.community_polls FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_polls.post_id AND p.author_id = auth.uid())
    AND NOT public.is_banned_from_post_community(post_id));
DROP POLICY IF EXISTS "Authors or creators can delete polls" ON public.community_polls;
CREATE POLICY "Authors or creators can delete polls" ON public.community_polls FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_polls.post_id
    AND (p.author_id = auth.uid() OR p.creator_id = auth.uid())));

CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  option_index integer NOT NULL CHECK (option_index >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll ON public.community_poll_votes (poll_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_poll_votes TO authenticated;
GRANT ALL ON public.community_poll_votes TO service_role;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View poll votes with post access" ON public.community_poll_votes;
CREATE POLICY "View poll votes with post access" ON public.community_poll_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_polls cp JOIN public.community_posts p ON p.id = cp.post_id
    WHERE cp.id = community_poll_votes.poll_id
      AND (auth.uid() = p.author_id OR public.has_creator_access(p.creator_id))));
DROP POLICY IF EXISTS "Members can vote in polls" ON public.community_poll_votes;
CREATE POLICY "Members can vote in polls" ON public.community_poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.community_polls cp JOIN public.community_posts p ON p.id = cp.post_id
    WHERE cp.id = community_poll_votes.poll_id
      AND community_poll_votes.option_index < jsonb_array_length(cp.options)
      AND public.has_creator_access(p.creator_id)
      AND NOT public.is_community_banned(p.creator_id)));
DROP POLICY IF EXISTS "Voters can change own vote" ON public.community_poll_votes;
CREATE POLICY "Voters can change own vote" ON public.community_poll_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.community_polls cp WHERE cp.id = community_poll_votes.poll_id
      AND community_poll_votes.option_index < jsonb_array_length(cp.options)));
DROP POLICY IF EXISTS "Voters can remove own vote" ON public.community_poll_votes;
CREATE POLICY "Voters can remove own vote" ON public.community_poll_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_community_comments_parent
  ON public.community_comments (parent_id) WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.community_comment_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_comment_likes_comment ON public.community_comment_likes (comment_id);
GRANT SELECT, INSERT, DELETE ON public.community_comment_likes TO authenticated;
GRANT ALL ON public.community_comment_likes TO service_role;
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View comment likes with access" ON public.community_comment_likes;
CREATE POLICY "View comment likes with access" ON public.community_comment_likes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_comments c JOIN public.community_posts p ON p.id = c.post_id
    WHERE c.id = community_comment_likes.comment_id
      AND (auth.uid() = c.author_id OR public.has_creator_access(p.creator_id))));
DROP POLICY IF EXISTS "Members can like comments" ON public.community_comment_likes;
CREATE POLICY "Members can like comments" ON public.community_comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.community_comments c JOIN public.community_posts p ON p.id = c.post_id
    WHERE c.id = community_comment_likes.comment_id
      AND public.has_creator_access(p.creator_id)
      AND NOT public.is_community_banned(p.creator_id)));
DROP POLICY IF EXISTS "Users can unlike comments" ON public.community_comment_likes;
CREATE POLICY "Users can unlike comments" ON public.community_comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_on_community_reply()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_parent_author UUID; v_post_author UUID; v_replier_name TEXT;
BEGIN
  BEGIN
    IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
    SELECT author_id INTO v_parent_author FROM public.community_comments WHERE id = NEW.parent_id;
    SELECT author_id INTO v_post_author FROM public.community_posts WHERE id = NEW.post_id;
    IF v_parent_author IS NULL OR v_parent_author = NEW.author_id OR v_parent_author = v_post_author THEN
      RETURN NEW;
    END IF;
    SELECT COALESCE(display_name, 'Someone') INTO v_replier_name
    FROM public.profiles WHERE user_id = NEW.author_id;
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, reference_id)
    VALUES (v_parent_author, 'community_reply', 'New Reply',
      COALESCE(v_replier_name, 'Someone') || ' replied to your comment: "' || LEFT(NEW.body, 80) || '"',
      NEW.author_id, NEW.post_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[community_depth] notify_on_community_reply failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_community_reply ON public.community_comments;
CREATE TRIGGER trg_notify_community_reply AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_community_reply();

CREATE TABLE IF NOT EXISTS public.community_event_rsvps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  status     text NOT NULL DEFAULT 'going' CHECK (status IN ('going')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_event_rsvps_event ON public.community_event_rsvps (event_id);
GRANT SELECT, INSERT, DELETE ON public.community_event_rsvps TO authenticated;
GRANT ALL ON public.community_event_rsvps TO service_role;
ALTER TABLE public.community_event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View RSVPs with community access" ON public.community_event_rsvps;
CREATE POLICY "View RSVPs with community access" ON public.community_event_rsvps FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.community_events e WHERE e.id = community_event_rsvps.event_id
      AND public.has_creator_access(e.creator_id)));
DROP POLICY IF EXISTS "Members can RSVP" ON public.community_event_rsvps;
CREATE POLICY "Members can RSVP" ON public.community_event_rsvps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.community_events e WHERE e.id = community_event_rsvps.event_id
      AND public.has_creator_access(e.creator_id)
      AND NOT public.is_community_banned(e.creator_id)));
DROP POLICY IF EXISTS "Users can un-RSVP" ON public.community_event_rsvps;
CREATE POLICY "Users can un-RSVP" ON public.community_event_rsvps FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.community_events e WHERE e.id = community_event_rsvps.event_id
      AND e.creator_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.award_points_on_rsvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.community_events WHERE id = NEW.event_id;
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.member_points (user_id, creator_id, action_type, points, source_id)
    VALUES (NEW.user_id, v_creator_id, 'event_rsvp', 15, NEW.event_id)
    ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS award_points_on_rsvp ON public.community_event_rsvps;
CREATE TRIGGER award_points_on_rsvp AFTER INSERT ON public.community_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_rsvp();

-- ============ 20260706210000_tier_gating.sql ============
ALTER TABLE public.subscription_tiers ADD COLUMN IF NOT EXISTS tier_rank integer;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY creator_id
           ORDER BY price_monthly ASC, created_at ASC, id ASC) AS rnk
  FROM public.subscription_tiers
)
UPDATE public.subscription_tiers st SET tier_rank = ranked.rnk
FROM ranked WHERE st.id = ranked.id AND st.tier_rank IS NULL;

ALTER TABLE public.classroom_modules ADD COLUMN IF NOT EXISTS min_tier_rank integer;
ALTER TABLE public.classroom_lessons ADD COLUMN IF NOT EXISTS min_tier_rank integer;
DO $$ BEGIN
  ALTER TABLE public.classroom_modules ADD CONSTRAINT classroom_modules_min_tier_rank_check
    CHECK (min_tier_rank IS NULL OR min_tier_rank >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.classroom_lessons ADD CONSTRAINT classroom_lessons_min_tier_rank_check
    CHECK (min_tier_rank IS NULL OR min_tier_rank >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.has_tier_access(p_creator_id uuid, p_min_rank integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_min_rank IS NULL
    OR auth.uid() = p_creator_id
    OR EXISTS (SELECT 1 FROM public.member_subscriptions ms
      JOIN public.subscription_tiers st ON st.id = ms.tier_id
      WHERE ms.member_id = auth.uid()
        AND ms.creator_id = p_creator_id
        AND ms.status IN ('active','trialing')
        AND COALESCE(st.tier_rank, 1 + (
          SELECT COUNT(*)::integer FROM public.subscription_tiers t2
          WHERE t2.creator_id = st.creator_id AND t2.id <> st.id
            AND (t2.price_monthly < st.price_monthly
              OR (t2.price_monthly = st.price_monthly AND t2.created_at < st.created_at))
        )) >= p_min_rank)
    OR EXISTS (SELECT 1 FROM public.access_grants ag
      JOIN public.creator_spaces cs ON cs.id = ag.resource_id
      WHERE ag.user_id = auth.uid() AND ag.revoked_at IS NULL
        AND ag.resource_type = 'community' AND cs.creator_id = p_creator_id);
$$;
REVOKE ALL ON FUNCTION public.has_tier_access(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.has_tier_access(uuid, integer) TO authenticated;

DROP POLICY IF EXISTS "View free or accessible modules" ON public.classroom_modules;
CREATE POLICY "View free or accessible modules" ON public.classroom_modules FOR SELECT TO authenticated
  USING (is_free OR (public.has_creator_access(creator_id)
    AND (min_tier_rank IS NULL OR public.has_tier_access(creator_id, min_tier_rank))));

DROP POLICY IF EXISTS "View free or accessible lessons" ON public.classroom_lessons;
CREATE POLICY "View free or accessible lessons" ON public.classroom_lessons FOR SELECT TO authenticated
  USING (is_free OR (public.has_creator_access(creator_id)
    AND (min_tier_rank IS NULL OR public.has_tier_access(creator_id, min_tier_rank))));

CREATE OR REPLACE FUNCTION public.tier_gated_lesson_counts(p_creator_id uuid)
RETURNS TABLE(min_rank integer, lesson_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(COALESCE(l.min_tier_rank, 0), COALESCE(m.min_tier_rank, 0)) AS min_rank,
         COUNT(*) AS lesson_count
  FROM public.classroom_lessons l
  JOIN public.classroom_modules m ON m.id = l.module_id
  WHERE l.creator_id = p_creator_id AND l.is_free = false
    AND GREATEST(COALESCE(l.min_tier_rank, 0), COALESCE(m.min_tier_rank, 0)) > 0
  GROUP BY 1;
$$;
REVOKE ALL ON FUNCTION public.tier_gated_lesson_counts(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.tier_gated_lesson_counts(uuid) TO authenticated, anon;

ALTER TABLE public.classroom_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- ============ 20260706240000_crm_v2.sql ============
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS value_cents integer
  CHECK (value_cents IS NULL OR value_cents >= 0);

CREATE OR REPLACE FUNCTION public.crm_upsert_contact(
  p_creator_id uuid, p_user_id uuid, p_email text, p_name text,
  p_source text, p_activity_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_creator_id IS NULL OR p_email IS NULL OR btrim(p_email) = '' THEN RETURN; END IF;
  INSERT INTO public.crm_contacts (creator_id, user_id, email, name, source, last_activity_at)
  VALUES (p_creator_id, p_user_id, lower(btrim(p_email)),
    NULLIF(btrim(COALESCE(p_name, '')), ''), p_source, p_activity_at)
  ON CONFLICT (creator_id, email) DO UPDATE SET
    user_id = COALESCE(public.crm_contacts.user_id, EXCLUDED.user_id),
    name = COALESCE(NULLIF(public.crm_contacts.name, ''), EXCLUDED.name),
    last_activity_at = GREATEST(
      COALESCE(public.crm_contacts.last_activity_at, EXCLUDED.last_activity_at),
      COALESCE(EXCLUDED.last_activity_at, public.crm_contacts.last_activity_at));
END; $$;

CREATE OR REPLACE FUNCTION public.crm_upsert_contact_for_user(
  p_creator_id uuid, p_user_id uuid, p_source text, p_activity_at timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_name text;
BEGIN
  IF p_creator_id IS NULL OR p_user_id IS NULL THEN RETURN NULL; END IF;
  SELECT lower(au.email),
    COALESCE(NULLIF(btrim(pr.display_name), ''),
      NULLIF(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.username)
  INTO v_email, v_name FROM auth.users au
  LEFT JOIN public.profiles pr ON pr.user_id = au.id
  WHERE au.id = p_user_id;
  IF v_email IS NULL THEN RETURN NULL; END IF;
  PERFORM public.crm_upsert_contact(p_creator_id, p_user_id, v_email, v_name, p_source, p_activity_at);
  RETURN v_email;
END; $$;

CREATE OR REPLACE FUNCTION public.crm_advance_stage_to_customer(
  p_creator_id uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_creator_id IS NULL OR p_email IS NULL OR btrim(p_email) = '' THEN RETURN; END IF;
  UPDATE public.crm_contacts SET stage = 'customer'
   WHERE creator_id = p_creator_id
     AND email = lower(btrim(p_email))
     AND stage IN ('lead', 'engaged');
END; $$;

REVOKE ALL ON FUNCTION public.crm_upsert_contact(uuid, uuid, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_upsert_contact_for_user(uuid, uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_advance_stage_to_customer(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.crm_auto_sync_community_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public.crm_upsert_contact_for_user(NEW.creator_id, NEW.user_id, 'member', NEW.joined_at);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (community_members %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_crm_auto_sync_community_member ON public.community_members;
CREATE TRIGGER trg_crm_auto_sync_community_member AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_community_member();

CREATE OR REPLACE FUNCTION public.crm_auto_sync_subscriber()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public.crm_upsert_contact(NEW.creator_id, NULL, NEW.email, NEW.name, 'subscriber', NEW.created_at);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (subscribers %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_crm_auto_sync_subscriber ON public.subscribers;
CREATE TRIGGER trg_crm_auto_sync_subscriber AFTER INSERT ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_subscriber();

CREATE OR REPLACE FUNCTION public.crm_auto_sync_product_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  BEGIN
    IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      v_email := public.crm_upsert_contact_for_user(NEW.creator_id, NEW.buyer_id, 'buyer', NEW.created_at);
      PERFORM public.crm_advance_stage_to_customer(NEW.creator_id, v_email);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (product_purchases %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_crm_auto_sync_product_purchase ON public.product_purchases;
CREATE TRIGGER trg_crm_auto_sync_product_purchase
  AFTER INSERT OR UPDATE OF status ON public.product_purchases
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_product_purchase();

CREATE OR REPLACE FUNCTION public.crm_auto_sync_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
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
END; $$;
DROP TRIGGER IF EXISTS trg_crm_auto_sync_ticket ON public.tickets;
CREATE TRIGGER trg_crm_auto_sync_ticket AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_ticket();

CREATE OR REPLACE FUNCTION public.crm_auto_sync_booking_inquiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator_id uuid;
BEGIN
  BEGIN
    SELECT pr.user_id INTO v_creator_id FROM public.profiles pr
     WHERE pr.username IS NOT NULL AND lower(pr.username) = lower(NEW.artist_slug) LIMIT 1;
    IF v_creator_id IS NOT NULL THEN
      PERFORM public.crm_upsert_contact(v_creator_id, NULL, NEW.contact_email, NEW.contact_name, 'booking', NEW.created_at);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (public_booking_inquiries %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_crm_auto_sync_booking_inquiry ON public.public_booking_inquiries;
CREATE TRIGGER trg_crm_auto_sync_booking_inquiry AFTER INSERT ON public.public_booking_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_booking_inquiry();

CREATE OR REPLACE FUNCTION public.crm_auto_sync_member_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status <> 'active') THEN
      RETURN NEW;
    END IF;
    v_email := public.crm_upsert_contact_for_user(NEW.creator_id, NEW.member_id, 'member',
      GREATEST(NEW.created_at, COALESCE(NEW.current_period_start, NEW.created_at)));
    IF NEW.status = 'active' THEN
      PERFORM public.crm_advance_stage_to_customer(NEW.creator_id, v_email);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'crm auto-sync (member_subscriptions %) failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_crm_auto_sync_member_subscription ON public.member_subscriptions;
CREATE TRIGGER trg_crm_auto_sync_member_subscription
  AFTER INSERT OR UPDATE OF status ON public.member_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.crm_auto_sync_member_subscription();

CREATE OR REPLACE FUNCTION public.crm_enroll_on_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    BEGIN
      INSERT INTO public.drip_sequence_enrollments (sequence_id, subscriber_email)
      SELECT ds.id, NEW.email FROM public.drip_sequences ds
       WHERE ds.creator_id = NEW.creator_id AND ds.status = 'active'
         AND ds.trigger_event = 'crm_stage_' || NEW.stage
      ON CONFLICT (sequence_id, subscriber_email) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'crm stage-change drip enrollment failed for contact %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.crm_enroll_on_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_community_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_subscriber() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_product_purchase() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_ticket() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_booking_inquiry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_auto_sync_member_subscription() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_crm_enroll_on_stage_change ON public.crm_contacts;
CREATE TRIGGER trg_crm_enroll_on_stage_change AFTER UPDATE OF stage ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_enroll_on_stage_change();