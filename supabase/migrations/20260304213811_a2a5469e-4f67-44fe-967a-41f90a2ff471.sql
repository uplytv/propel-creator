
-- Create job_notifications table
CREATE TABLE public.job_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.job_applications(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job notifications"
  ON public.job_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own job notifications"
  ON public.job_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert job notifications"
  ON public.job_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_notifications;

-- Trigger function to create notifications on status change
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_title TEXT;
  v_applicant_name TEXT;
  v_creator_id UUID;
  v_status_label TEXT;
  v_message TEXT;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get job info
  SELECT title, creator_id INTO v_job_title, v_creator_id
  FROM public.jobs WHERE id = NEW.job_id;

  -- Get applicant name
  SELECT COALESCE(display_name, 'A creator') INTO v_applicant_name
  FROM public.profiles WHERE user_id = NEW.applicant_id;

  -- Map status to label
  v_status_label := CASE NEW.status::text
    WHEN 'reviewed' THEN 'Reviewed'
    WHEN 'shortlisted' THEN 'Shortlisted'
    WHEN 'hired' THEN 'Hired'
    WHEN 'rejected' THEN 'Not Selected'
    ELSE NEW.status::text
  END;

  -- Notify the applicant
  IF NEW.status::text IN ('reviewed', 'shortlisted', 'hired', 'rejected') THEN
    v_message := CASE NEW.status::text
      WHEN 'shortlisted' THEN 'Great news! You''ve been shortlisted for "' || v_job_title || '". The creator may reach out soon.'
      WHEN 'hired' THEN 'Congratulations! You''ve been hired for "' || v_job_title || '". Check messages for next steps.'
      WHEN 'rejected' THEN 'Your application for "' || v_job_title || '" was not selected this time. Keep applying!'
      WHEN 'reviewed' THEN 'Your application for "' || v_job_title || '" has been reviewed by the creator.'
      ELSE 'Your application status for "' || v_job_title || '" changed to ' || v_status_label || '.'
    END;

    INSERT INTO public.job_notifications (user_id, job_id, application_id, type, title, message)
    VALUES (NEW.applicant_id, NEW.job_id, NEW.id, 'status_' || NEW.status::text, 'Application ' || v_status_label, v_message);
  END IF;

  -- Notify the creator for new applications
  IF OLD.status::text = 'pending' AND NEW.status::text = 'reviewed' THEN
    -- no extra creator notification needed here
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();

-- Also notify creator when a new application is submitted
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_title TEXT;
  v_creator_id UUID;
  v_applicant_name TEXT;
BEGIN
  SELECT title, creator_id INTO v_job_title, v_creator_id
  FROM public.jobs WHERE id = NEW.job_id;

  SELECT COALESCE(display_name, 'Someone') INTO v_applicant_name
  FROM public.profiles WHERE user_id = NEW.applicant_id;

  INSERT INTO public.job_notifications (user_id, job_id, application_id, type, title, message)
  VALUES (v_creator_id, NEW.job_id, NEW.id, 'new_application', 'New Application', v_applicant_name || ' applied to your job "' || v_job_title || '".');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_application
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_application();
