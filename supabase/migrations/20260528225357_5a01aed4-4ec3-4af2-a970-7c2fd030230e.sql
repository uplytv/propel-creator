
-- 1. Extend tracks with locking metadata
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_type text,
  ADD COLUMN IF NOT EXISTS unlock_price_cents integer,
  ADD COLUMN IF NOT EXISTS required_tier_id uuid REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS release_status text NOT NULL DEFAULT 'released',
  ADD COLUMN IF NOT EXISTS scheduled_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS preview_start_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_duration_seconds integer NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS preview_url text;

DO $$ BEGIN
  ALTER TABLE public.tracks
    ADD CONSTRAINT tracks_unlock_type_check
    CHECK (unlock_type IS NULL OR unlock_type IN ('purchase','subscription','both'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tracks
    ADD CONSTRAINT tracks_release_status_check
    CHECK (release_status IN ('released','unreleased'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tracks
    ADD CONSTRAINT tracks_locked_requires_config
    CHECK (
      is_locked = false
      OR (
        unlock_type IS NOT NULL
        AND (unlock_type NOT IN ('purchase','both') OR (unlock_price_cents IS NOT NULL AND unlock_price_cents > 0))
        AND (unlock_type NOT IN ('subscription','both') OR required_tier_id IS NOT NULL)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_tracks_locked_creator
  ON public.tracks (creator_id) WHERE is_locked = true;

CREATE INDEX IF NOT EXISTS idx_tracks_scheduled_release
  ON public.tracks (scheduled_release_at)
  WHERE is_locked = true AND scheduled_release_at IS NOT NULL;

-- 2. Private assets table for locked tracks (keeps full source out of public tracks row)
CREATE TABLE IF NOT EXISTS public.track_private_assets (
  track_id uuid PRIMARY KEY REFERENCES public.tracks(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  mux_asset_id text,
  mux_playback_id text,
  storage_bucket text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_private_assets TO authenticated;
GRANT ALL ON public.track_private_assets TO service_role;

ALTER TABLE public.track_private_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artist reads own private assets" ON public.track_private_assets;
CREATE POLICY "Artist reads own private assets"
  ON public.track_private_assets FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Artist writes own private assets" ON public.track_private_assets;
CREATE POLICY "Artist writes own private assets"
  ON public.track_private_assets FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Artist updates own private assets" ON public.track_private_assets;
CREATE POLICY "Artist updates own private assets"
  ON public.track_private_assets FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Artist deletes own private assets" ON public.track_private_assets;
CREATE POLICY "Artist deletes own private assets"
  ON public.track_private_assets FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- 3. Allow 'track' as a resource_type on access_grants
ALTER TABLE public.access_grants
  DROP CONSTRAINT IF EXISTS access_grants_resource_type_check;

ALTER TABLE public.access_grants
  ADD CONSTRAINT access_grants_resource_type_check
  CHECK (resource_type = ANY (ARRAY[
    'membership_tier','product','course','classroom','pdf',
    'community','stream','job_post','track'
  ]));

-- 4. Security-definer access check for tracks
CREATE OR REPLACE FUNCTION public.has_track_access(_user_id uuid, _track_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tracks t
    WHERE t.id = _track_id
      AND (
        -- not locked → always accessible
        t.is_locked = false
        -- owner always has access
        OR t.creator_id = _user_id
        -- purchased
        OR EXISTS (
          SELECT 1 FROM public.access_grants ag
          WHERE ag.user_id = _user_id
            AND ag.resource_type = 'track'
            AND ag.resource_id = _track_id
            AND ag.revoked_at IS NULL
            AND (ag.expires_at IS NULL OR ag.expires_at > now())
        )
        -- active subscription to required tier
        OR (
          t.unlock_type IN ('subscription','both')
          AND t.required_tier_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.member_subscriptions ms
            WHERE ms.member_id = _user_id
              AND ms.tier_id = t.required_tier_id
              AND ms.status = 'active'
              AND (ms.current_period_end IS NULL OR ms.current_period_end > now())
          )
        )
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_track_access(uuid, uuid) TO authenticated, anon, service_role;

-- 5. Storage buckets for previews + private full files
INSERT INTO storage.buckets (id, name, public)
VALUES ('track-previews', 'track-previews', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('track-private', 'track-private', false)
ON CONFLICT (id) DO NOTHING;

-- Public previews: anyone can read
DROP POLICY IF EXISTS "Track previews are public" ON storage.objects;
CREATE POLICY "Track previews are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'track-previews');

DROP POLICY IF EXISTS "Artists upload own previews" ON storage.objects;
CREATE POLICY "Artists upload own previews"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'track-previews'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Artists update own previews" ON storage.objects;
CREATE POLICY "Artists update own previews"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'track-previews'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Artists delete own previews" ON storage.objects;
CREATE POLICY "Artists delete own previews"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'track-previews'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Private bucket: NO public select. Artists can write/manage their own folder; reads happen via service role.
DROP POLICY IF EXISTS "Artists upload own private tracks" ON storage.objects;
CREATE POLICY "Artists upload own private tracks"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'track-private'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Artists read own private tracks" ON storage.objects;
CREATE POLICY "Artists read own private tracks"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'track-private'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Artists update own private tracks" ON storage.objects;
CREATE POLICY "Artists update own private tracks"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'track-private'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Artists delete own private tracks" ON storage.objects;
CREATE POLICY "Artists delete own private tracks"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'track-private'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS update_track_private_assets_updated_at ON public.track_private_assets;
CREATE TRIGGER update_track_private_assets_updated_at
  BEFORE UPDATE ON public.track_private_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
