
-- Drop restrictive UPDATE policies and recreate as permissive
DROP POLICY IF EXISTS "Users can update own notifications" ON public.campaign_notifications;
CREATE POLICY "Users can update own notifications" ON public.campaign_notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own job notifications" ON public.job_notifications;
CREATE POLICY "Users can update own job notifications" ON public.job_notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Also need a permissive SELECT for both tables (replace restrictive ones)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.campaign_notifications;
CREATE POLICY "Users can view own notifications" ON public.campaign_notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own job notifications" ON public.job_notifications;
CREATE POLICY "Users can view own job notifications" ON public.job_notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);
