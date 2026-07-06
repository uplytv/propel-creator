-- ============================================================
-- Phase 2 Security Hardening: reserved usernames + username format
-- ============================================================
-- The bare /:username catch-all is the LAST route in App.tsx, so a
-- profiles.username equal to a real route's first segment collides with
-- application routes (e.g. "dashboard", "admin", "auth"). Client-side
-- validation lives in src/lib/reservedUsernames.ts (derived from the route
-- registry); this trigger is the server-side enforcement so direct PostgREST
-- writes cannot bypass it.
--
-- Rules (enforced ONLY when the username is being set or changed, so legacy
-- rows and unrelated profile updates are never blocked):
--   * format: ^[a-z0-9_]{3,30}$
--   * must not be in the reserved list below
--
-- The reserved list is the expanded output of src/lib/reservedUsernames.ts
-- (route-registry first segments + static additions, each with compact and
-- underscore variants). Keep the two in sync when adding routes.
--
-- RLS: this migration touches only public.profiles, which already has RLS
-- enabled with self-scoped policies (no policy changes here; a BEFORE trigger
-- adds no new read/write surface).

CREATE OR REPLACE FUNCTION public.enforce_username_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reserved text[] := ARRAY[
    'about', 'account', 'achievements', 'ad-integrations', 'ad_integrations',
    'adintegrations', 'admin', 'ads', 'ads-manager', 'ads_manager',
    'adsmanager', 'affiliates', 'analytics', 'andy', 'andymusic',
    'andymusic1', 'api', 'app', 'apply', 'aria', 'aria-command',
    'aria_command', 'ariacommand', 'arya', 'aryaxo', 'aryaxoblog',
    'aryaxolinks', 'aryaxosite', 'assets', 'auth', 'bazi', 'billing',
    'blake', 'blakethegreat', 'blog', 'bobby', 'boost-cancel',
    'boost-success', 'boost_cancel', 'boost_success', 'boostcancel',
    'boostsuccess', 'buy', 'buy-credits', 'buy_credits', 'buycredits', 'c',
    'camera', 'collaborate', 'community', 'contact', 'content-library',
    'content_library', 'contentlibrary', 'create', 'create-event',
    'create_event', 'createevent', 'creator', 'creator-affiliate',
    'creator_affiliate', 'creatoraffiliate', 'crm', 'dashboard', 'developer',
    'discover', 'distribution', 'docs', 'edge', 'email-unsubscribe',
    'email_unsubscribe', 'emailunsubscribe', 'embed', 'event', 'events',
    'following', 'for-you', 'for_you', 'foryou', 'founderoffers', 'founders',
    'founderservices', 'functions', 'go-live', 'go_live', 'golive',
    'graphql', 'grow', 'growth-reports', 'growth_reports', 'growthreports',
    'health', 'help', 'home', 'inbox', 'index', 'invite', 'invite-codes',
    'invite_codes', 'invitecodes', 'job-messages', 'job_messages',
    'jobmessages', 'jobs', 'join', 'launchpad', 'leaderboard', 'legal',
    'link', 'live', 'login', 'logout', 'mail', 'marketplace', 'messages',
    'morvarid', 'morvaridshahbazi', 'music', 'my-page', 'my-rep', 'my_page',
    'my_rep', 'mypage', 'myrep', 'network', 'new', 'newsletter',
    'notifications', 'official', 'omid', 'omid_music', 'omidmusic',
    'onboarding', 'p', 'pending-approval', 'pending_approval',
    'pendingapproval', 'playlist', 'playlists', 'podcast', 'podcast-rss',
    'podcast_rss', 'podcastrss', 'post-job', 'post_job', 'postjob', 'ppv',
    'presave', 'pricing', 'privacy', 'products', 'purchases', 'radiate',
    'realtime', 'ref', 'repurpose', 'reset-password', 'reset_password',
    'resetpassword', 'rest', 'root', 'roster', 'scan', 'search', 'security',
    'settings', 'shop', 'shorts', 'signin', 'signup', 'site', 'smart-links',
    'smart_links', 'smartlinks', 'social', 'sonuha', 'space', 'staff',
    'static', 'storage', 'stream', 'support', 'system', 'talent-profile',
    'talent_profile', 'talentprofile', 'team', 'terms', 'test', 'tickets',
    'trending', 'tv', 'unsubscribe', 'upgrade', 'uply', 'uplytv', 'user',
    'users', 'vs', 'waitlist', 'wallet', 'webhook', 'webhooks', 'www'
  ];
BEGIN
  -- Nothing to enforce when username is not being set/changed.
  IF NEW.username IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  IF NEW.username !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters using only lowercase letters, numbers, and underscores.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF lower(NEW.username) = ANY (reserved) THEN
    RAISE EXCEPTION 'This username is reserved. Please choose another.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_username_rules ON public.profiles;
CREATE TRIGGER trg_enforce_username_rules
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_username_rules();
