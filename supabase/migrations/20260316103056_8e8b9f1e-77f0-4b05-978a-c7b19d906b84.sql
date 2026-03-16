ALTER TABLE public.notification_preferences 
  ADD COLUMN IF NOT EXISTS new_follower_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tip_received_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS member_joined_email boolean NOT NULL DEFAULT true;