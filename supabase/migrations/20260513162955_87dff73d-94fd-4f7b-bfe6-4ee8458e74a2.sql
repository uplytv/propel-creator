-- Section 5: creator_works for non-musician portfolios
CREATE TABLE IF NOT EXISTS public.creator_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_type text NOT NULL CHECK (work_type IN ('artwork','video','film','episode','mix','photo','other')),
  title text NOT NULL,
  description text,
  media_url text,
  thumbnail_url text,
  external_url text,
  is_member_only boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_works_creator ON public.creator_works(creator_id, display_order);
CREATE INDEX IF NOT EXISTS idx_creator_works_type ON public.creator_works(work_type);

ALTER TABLE public.creator_works ENABLE ROW LEVEL SECURITY;

-- Public can read non-gated rows
CREATE POLICY "Public can view non-gated works"
  ON public.creator_works FOR SELECT
  USING (is_member_only = false);

-- Creator owner can read all their own (gated + non-gated)
CREATE POLICY "Creator can view own works"
  ON public.creator_works FOR SELECT
  USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Creator can insert own works"
  ON public.creator_works FOR INSERT
  WITH CHECK (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Creator can update own works"
  ON public.creator_works FOR UPDATE
  USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Creator can delete own works"
  ON public.creator_works FOR DELETE
  USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_creator_works_updated_at
  BEFORE UPDATE ON public.creator_works
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
