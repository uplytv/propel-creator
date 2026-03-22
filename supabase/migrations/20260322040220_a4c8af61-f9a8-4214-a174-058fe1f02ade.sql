-- Create function to notify admins on new signup via edge function
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  edge_url text;
  service_key text;
BEGIN
  -- Get the Supabase URL from vault or construct it
  edge_url := current_setting('app.settings.supabase_url', true);
  IF edge_url IS NULL THEN
    edge_url := 'https://dbjlhmbgskvhuzqvqfrl.supabase.co';
  END IF;

  -- Call the edge function via pg_net
  PERFORM net.http_post(
    url := edge_url || '/functions/v1/notify-admin-on-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'user_id', NEW.user_id,
        'display_name', NEW.display_name,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'role_type', NEW.role_type,
        'referral_code', NEW.referral_code,
        'created_at', NEW.created_at
      )
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block signup if notification fails
  RAISE WARNING 'notify_admin_on_new_signup failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table for new inserts
DROP TRIGGER IF EXISTS trg_notify_admin_on_signup ON public.profiles;
CREATE TRIGGER trg_notify_admin_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_new_signup();