CREATE POLICY "Users can delete own job notifications"
ON public.job_notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);