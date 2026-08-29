ALTER TABLE public.business_leads
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS business_leads_status_idx ON public.business_leads (status);
CREATE INDEX IF NOT EXISTS business_leads_source_idx ON public.business_leads (source);
CREATE INDEX IF NOT EXISTS business_leads_created_at_idx ON public.business_leads (created_at DESC);

CREATE OR REPLACE FUNCTION public.business_leads_touch_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at = now();
    NEW.handled = NEW.status IN ('won','lost','contacted','qualified');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_leads_touch_status_trg ON public.business_leads;
CREATE TRIGGER business_leads_touch_status_trg
BEFORE UPDATE ON public.business_leads
FOR EACH ROW EXECUTE FUNCTION public.business_leads_touch_status();