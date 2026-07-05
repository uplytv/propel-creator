-- Cancellation retention flow: exit-survey feedback captured when a user
-- cancels their UPLY platform subscription ($97/$297/$497 plans).
-- Written by the cancel-platform-subscription edge function (service role)
-- and, per RLS below, insertable by the owner directly.

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

-- Owner may insert their own feedback row.
CREATE POLICY "Users can insert own cancellation feedback"
  ON public.cancellation_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins may read feedback. No public read; no update/delete for anyone.
CREATE POLICY "Admins can read cancellation feedback"
  ON public.cancellation_feedback
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
