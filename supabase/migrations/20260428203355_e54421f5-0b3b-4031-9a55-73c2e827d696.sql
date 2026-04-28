-- Apple Music user token on presaves
ALTER TABLE public.smart_link_presaves
  ADD COLUMN IF NOT EXISTS apple_music_user_token text;

-- Unlock + contest fields on smart_links
ALTER TABLE public.smart_links
  ADD COLUMN IF NOT EXISTS unlock_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS unlock_spotify_artist_id text,
  ADD COLUMN IF NOT EXISTS unlock_reward_type text DEFAULT 'download',
  ADD COLUMN IF NOT EXISTS unlock_reward_url text,
  ADD COLUMN IF NOT EXISTS unlock_reward_label text,
  ADD COLUMN IF NOT EXISTS contest_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contest_prize text,
  ADD COLUMN IF NOT EXISTS contest_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS contest_winner_count integer DEFAULT 1;

-- Constrain unlock_type values (drop-and-recreate to be idempotent)
DO $$ BEGIN
  ALTER TABLE public.smart_links DROP CONSTRAINT IF EXISTS smart_links_unlock_type_check;
  ALTER TABLE public.smart_links ADD CONSTRAINT smart_links_unlock_type_check
    CHECK (unlock_type IN ('none','spotify_follow','email','social_share'));
  ALTER TABLE public.smart_links DROP CONSTRAINT IF EXISTS smart_links_unlock_reward_type_check;
  ALTER TABLE public.smart_links ADD CONSTRAINT smart_links_unlock_reward_type_check
    CHECK (unlock_reward_type IN ('download','content','discount'));
END $$;

-- Unlocks table
CREATE TABLE IF NOT EXISTS public.smart_link_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.smart_links(id) ON DELETE CASCADE,
  fan_email text,
  spotify_user_id text,
  unlock_type text NOT NULL,
  unlocked_at timestamptz DEFAULT now()
);

ALTER TABLE public.smart_link_unlocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can insert unlock"
    ON public.smart_link_unlocks FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creators view their unlocks"
    ON public.smart_link_unlocks FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.smart_links sl
              WHERE sl.id = link_id AND sl.creator_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_smart_link_unlocks_link
  ON public.smart_link_unlocks(link_id);

-- Contest entries
CREATE TABLE IF NOT EXISTS public.smart_link_contest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.smart_links(id) ON DELETE CASCADE,
  fan_email text NOT NULL,
  fan_name text,
  referral_code text UNIQUE NOT NULL DEFAULT substring(md5(random()::text || clock_timestamp()::text), 1, 8),
  referred_by text,
  referral_count integer DEFAULT 0,
  total_points integer DEFAULT 1,
  entered_at timestamptz DEFAULT now(),
  UNIQUE (link_id, fan_email)
);

ALTER TABLE public.smart_link_contest_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can enter contest"
    ON public.smart_link_contest_entries FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creators view contest entries"
    ON public.smart_link_contest_entries FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.smart_links sl
              WHERE sl.id = link_id AND sl.creator_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_contest_entries_link
  ON public.smart_link_contest_entries(link_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_contest_referral_code
  ON public.smart_link_contest_entries(referral_code);

-- RPC: atomically bump a referrer's count
CREATE OR REPLACE FUNCTION public.increment_referral_count(p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.smart_link_contest_entries
  SET referral_count = referral_count + 1,
      total_points = total_points + 1
  WHERE referral_code = p_code;
$$;