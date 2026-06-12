
CREATE TABLE IF NOT EXISTS public.event_fee_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  old_fee_pct numeric,
  new_fee_pct numeric NOT NULL,
  changed_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_fee_change_log TO authenticated;
GRANT ALL ON public.event_fee_change_log TO service_role;

ALTER TABLE public.event_fee_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view fee change log" ON public.event_fee_change_log;
CREATE POLICY "Admins can view fee change log"
ON public.event_fee_change_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS event_fee_change_log_event_id_idx
  ON public.event_fee_change_log(event_id, created_at DESC);

-- Allow admins to update events (needed to adjust platform_fee_pct)
DROP POLICY IF EXISTS "Admins can update any event" ON public.events;
CREATE POLICY "Admins can update any event"
ON public.events FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger that logs any change to platform_fee_pct
CREATE OR REPLACE FUNCTION public.log_event_fee_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.platform_fee_pct IS DISTINCT FROM OLD.platform_fee_pct THEN
    INSERT INTO public.event_fee_change_log (event_id, old_fee_pct, new_fee_pct, changed_by, reason)
    VALUES (
      NEW.id,
      OLD.platform_fee_pct,
      NEW.platform_fee_pct,
      auth.uid(),
      NULLIF(current_setting('app.fee_change_reason', true), '')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_event_fee_change ON public.events;
CREATE TRIGGER trg_log_event_fee_change
AFTER UPDATE OF platform_fee_pct ON public.events
FOR EACH ROW EXECUTE FUNCTION public.log_event_fee_change();
