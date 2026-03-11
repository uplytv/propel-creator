
CREATE OR REPLACE FUNCTION public.increment_applicant_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.launch_config SET total_applicants = total_applicants + 1 WHERE id = (SELECT id FROM public.launch_config LIMIT 1);
  RETURN NEW;
END;
$function$;
