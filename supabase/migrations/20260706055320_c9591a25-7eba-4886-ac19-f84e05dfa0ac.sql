-- ============ 20260705000000_founding_creator_badge.sql ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founding_creator boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET is_founding_creator = true;

-- ============ 20260705120000_cancellation_feedback.sql ============
CREATE TABLE public.cancellation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text,
  reason text,
  would_return text,
  rating int CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own cancellation feedback"
  ON public.cancellation_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read cancellation feedback"
  ON public.cancellation_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT ON public.cancellation_feedback TO authenticated;
GRANT ALL ON public.cancellation_feedback TO service_role;

-- ============ 20260705150000_account_type.sql ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'creator';
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('creator', 'member'));
UPDATE public.profiles SET account_type = 'creator' WHERE account_type IS DISTINCT FROM 'creator';

-- ============ 20260705180000_founding_creators_cover_cleanup.sql ============
UPDATE public.creator_spaces
SET cover_image_url = NULL, updated_at = now()
WHERE name ILIKE 'Uply Founding Creators';
UPDATE public.space_media
SET url = '', thumbnail_url = NULL, mux_playback_id = NULL
WHERE creator_id IN (
  SELECT creator_id FROM public.creator_spaces WHERE name ILIKE 'Uply Founding Creators'
);