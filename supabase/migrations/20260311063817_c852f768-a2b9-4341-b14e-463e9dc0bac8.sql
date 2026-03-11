
-- Launch config table (single row)
CREATE TABLE public.launch_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_launched boolean NOT NULL DEFAULT false,
  total_applicants integer NOT NULL DEFAULT 0
);

ALTER TABLE public.launch_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read launch_config
CREATE POLICY "Anyone can read launch config"
  ON public.launch_config FOR SELECT
  TO public
  USING (true);

-- Only admins can update launch_config
CREATE POLICY "Admins can update launch config"
  ON public.launch_config FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert initial row
INSERT INTO public.launch_config (is_launched, total_applicants) VALUES (false, 0);

-- Waitlist table
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  social_handle text,
  creator_type text,
  follower_count text,
  primary_platform text,
  one_sentence text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint on email
CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist (email);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public signup)
CREATE POLICY "Anyone can submit waitlist application"
  ON public.waitlist FOR INSERT
  TO public
  WITH CHECK (true);

-- Admins can view all waitlist entries
CREATE POLICY "Admins can view waitlist"
  ON public.waitlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to increment applicant count
CREATE OR REPLACE FUNCTION public.increment_applicant_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.launch_config SET total_applicants = total_applicants + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_waitlist_insert
  AFTER INSERT ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_applicant_count();
