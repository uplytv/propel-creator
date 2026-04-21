-- Add moderation columns to short_comments
ALTER TABLE public.short_comments
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_by uuid,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- Helper: resolve creator_id of a short_comment (works for clip or short source)
CREATE OR REPLACE FUNCTION public.short_comment_creator_id(_short_id uuid, _source text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _source = 'clip'  THEN (SELECT creator_id FROM public.clips  WHERE id = _short_id)
    WHEN _source = 'short' THEN (SELECT creator_id FROM public.shorts WHERE id = _short_id)
    ELSE NULL
  END
$$;

-- Drop and recreate policies to allow creator moderation
DROP POLICY IF EXISTS "Comment authors can delete their comments" ON public.short_comments;
DROP POLICY IF EXISTS "Comment authors can update their comments" ON public.short_comments;
DROP POLICY IF EXISTS "Creators can moderate comments on their content" ON public.short_comments;
DROP POLICY IF EXISTS "Creators can delete comments on their content" ON public.short_comments;

CREATE POLICY "Comment authors can delete their comments"
ON public.short_comments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Creators can delete comments on their content"
ON public.short_comments FOR DELETE
USING (auth.uid() = public.short_comment_creator_id(short_id, source));

CREATE POLICY "Creators can hide comments on their content"
ON public.short_comments FOR UPDATE
USING (auth.uid() = public.short_comment_creator_id(short_id, source))
WITH CHECK (auth.uid() = public.short_comment_creator_id(short_id, source));

-- Reports table
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.short_comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL DEFAULT 'inappropriate',
  details text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, reporter_id)
);

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can report comments"
ON public.comment_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters can view their reports"
ON public.comment_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
ON public.comment_reports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.comment_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON public.comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON public.comment_reports(status);