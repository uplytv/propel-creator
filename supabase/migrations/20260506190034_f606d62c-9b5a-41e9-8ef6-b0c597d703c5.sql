CREATE OR REPLACE FUNCTION public.trg_send_ticket_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text := 'https://dbjlhmbgskvhuzqvqfrl.supabase.co/functions/v1/send-ticket-email';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiamxobWJnc2t2aHV6cXZxZnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTM1NzUsImV4cCI6MjA4ODE2OTU3NX0.hmFhgwZNpA3a8-ewpuupIChPbY1ykvx8XOvD7qyr66Q';
BEGIN
  IF NEW.status IN ('active','scanned') THEN
    PERFORM net.http_post(
      url := fn_url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon_key),
      body := jsonb_build_object('ticket_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_send_email ON public.tickets;
CREATE TRIGGER trg_tickets_send_email
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.trg_send_ticket_email();