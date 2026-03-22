
CREATE OR REPLACE FUNCTION public.on_waitlist_referral_milestone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referral_count >= 3 AND (OLD.referral_count < 3 OR OLD.early_access = false) THEN
    NEW.early_access := true;
  END IF;
  RETURN NEW;
END;
$function$;
