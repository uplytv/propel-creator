
-- A/B body testing
ALTER TABLE public.email_broadcasts ADD COLUMN IF NOT EXISTS ab_body_b text;

-- Subscriber segmentation columns
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS last_open_at timestamptz;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS last_click_at timestamptz;

-- Drip sequence send tracking
ALTER TABLE public.drip_sequence_sends ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE public.drip_sequence_sends ADD COLUMN IF NOT EXISTS clicked_at timestamptz;

-- Update increment function to also track last engagement times
CREATE OR REPLACE FUNCTION public.increment_subscriber_engagement(p_email text, p_field text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field = 'total_opens' THEN
    UPDATE subscribers SET 
      total_opens = COALESCE(total_opens, 0) + 1,
      lead_score = LEAST(100, COALESCE(lead_score, 0) + 2),
      last_open_at = now(),
      last_seen_at = now()
    WHERE email = p_email;
  ELSIF p_field = 'total_clicks' THEN
    UPDATE subscribers SET 
      total_clicks = COALESCE(total_clicks, 0) + 1,
      lead_score = LEAST(100, COALESCE(lead_score, 0) + 5),
      last_click_at = now(),
      last_seen_at = now()
    WHERE email = p_email;
  END IF;
END;
$$;
