CREATE TABLE IF NOT EXISTS public.artist_verification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  legal_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  primary_link TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_listeners INTEGER,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avap_user ON public.artist_verification_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_avap_status ON public.artist_verification_applications(status, created_at DESC);

ALTER TABLE public.artist_verification_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification apps"
ON public.artist_verification_applications FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own verification apps"
ON public.artist_verification_applications FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users update own pending apps"
ON public.artist_verification_applications FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins update verification apps"
ON public.artist_verification_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_avap_updated_at
BEFORE UPDATE ON public.artist_verification_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apply_verification_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.artist_profiles SET is_verified = true WHERE user_id = NEW.user_id;
    INSERT INTO public.artist_profiles (user_id, is_verified)
    SELECT NEW.user_id, true
    WHERE NOT EXISTS (SELECT 1 FROM public.artist_profiles WHERE user_id = NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_avap_apply_verification
AFTER UPDATE ON public.artist_verification_applications
FOR EACH ROW EXECUTE FUNCTION public.apply_verification_on_approval();