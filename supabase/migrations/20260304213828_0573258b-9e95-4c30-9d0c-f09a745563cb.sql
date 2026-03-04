
-- Fix the INSERT policy to only allow the trigger (service role) or the system
DROP POLICY "Service role can insert job notifications" ON public.job_notifications;
CREATE POLICY "System can insert job notifications"
  ON public.job_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
