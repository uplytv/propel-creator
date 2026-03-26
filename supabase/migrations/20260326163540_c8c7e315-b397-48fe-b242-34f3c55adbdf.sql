
CREATE TABLE public.creator_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creator_id, reviewer_id)
);

ALTER TABLE public.creator_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.creator_reviews FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.creator_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id AND reviewer_id != creator_id);

CREATE POLICY "Users can update own reviews"
  ON public.creator_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
  ON public.creator_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = reviewer_id);
