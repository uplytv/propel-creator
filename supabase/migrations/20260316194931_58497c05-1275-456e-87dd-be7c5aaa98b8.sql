-- Fix #3: Restrict profiles SELECT to owner only (public data via profiles_public view)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix #1: Tighten overly permissive service_role policies
-- These are for service_role which is server-side only, so they're acceptable.
-- No action needed as service_role policies with USING(true) are expected.