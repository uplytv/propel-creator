
-- Add lead scoring columns to subscribers
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_opens integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_clicks integer NOT NULL DEFAULT 0;

-- Add deliverability columns to email_broadcasts
ALTER TABLE public.email_broadcasts 
ADD COLUMN IF NOT EXISTS bounce_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS complaint_count integer NOT NULL DEFAULT 0;

-- Add branching columns to drip_sequence_steps
ALTER TABLE public.drip_sequence_steps
ADD COLUMN IF NOT EXISTS condition_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS condition_value text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS on_true_step integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS on_false_step integer DEFAULT NULL;

-- Create email templates library
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid DEFAULT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system templates"
ON public.email_templates FOR SELECT
USING (is_system = true);

CREATE POLICY "Creators can view own templates"
ON public.email_templates FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Creators can create own templates"
ON public.email_templates FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid() AND is_system = false);

CREATE POLICY "Creators can update own templates"
ON public.email_templates FOR UPDATE
TO authenticated
USING (creator_id = auth.uid() AND is_system = false);

CREATE POLICY "Creators can delete own templates"
ON public.email_templates FOR DELETE
TO authenticated
USING (creator_id = auth.uid() AND is_system = false);

-- Function to recalculate lead scores
CREATE OR REPLACE FUNCTION public.recalculate_subscriber_lead_scores(p_creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subscribers s
  SET lead_score = LEAST(100, 
    (COALESCE(s.total_opens, 0) * 2) + 
    (COALESCE(s.total_clicks, 0) * 5) + 
    (COALESCE(s.total_purchases, 0) * 20) +
    CASE WHEN s.last_seen_at > now() - interval '7 days' THEN 10 ELSE 0 END +
    CASE WHEN s.last_seen_at > now() - interval '30 days' THEN 5 ELSE 0 END
  )
  WHERE s.creator_id = p_creator_id AND s.unsubscribed = false;
END;
$$;

-- Seed system email templates
INSERT INTO public.email_templates (name, category, subject, body, is_system) VALUES
('Welcome Email', 'onboarding', 'Welcome to {{creator_name}}!', '<h2>Welcome! 🎉</h2><p>Thanks for joining. Here''s what you can expect:</p><ul><li>Exclusive content and updates</li><li>Early access to new releases</li><li>Community perks and events</li></ul><p>Stay tuned for more!</p>', true),
('Product Launch', 'marketing', '🚀 Introducing {{product_name}}', '<h2>Something exciting is here!</h2><p>We''ve been working hard on something special, and it''s finally ready.</p><p><strong>{{product_name}}</strong> is now available.</p><p><a href="{{product_url}}">Check it out →</a></p>', true),
('Event Invitation', 'events', 'You''re Invited: {{event_name}}', '<h2>You''re Invited! 🎟️</h2><p>Join us for <strong>{{event_name}}</strong></p><p>📅 {{event_date}}<br/>⏰ {{event_time}}</p><p><a href="{{event_url}}">RSVP Now →</a></p><p>Don''t miss out — spots are limited!</p>', true),
('Thank You', 'transactional', 'Thank you for your purchase!', '<h2>Thank You! 🙏</h2><p>Your purchase has been confirmed. We appreciate your support!</p><p>If you have any questions, just reply to this email.</p>', true),
('Re-engagement', 'retention', 'We miss you, {{subscriber_name}}!', '<h2>It''s been a while! 👋</h2><p>We noticed you haven''t been around lately. Here''s what you''ve been missing:</p><ul><li>New content drops</li><li>Community discussions</li><li>Exclusive deals</li></ul><p><a href="{{profile_url}}">Come back and check it out →</a></p>', true),
('Weekly Digest', 'content', '📧 Your Weekly Update from {{creator_name}}', '<h2>This Week''s Highlights</h2><p>Here''s a roundup of what happened this week:</p><p>{{weekly_content}}</p><p>See you next week! 🚀</p>', true);
