CREATE OR REPLACE FUNCTION public.dispatch_batched_admin_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  batch RECORD;
  admin_record RECORD;
  readable_type text;
  readable_title text;
  readable_body text;
BEGIN
  FOR batch IN
    SELECT * FROM admin_notification_batch
    WHERE dispatched = false AND last_event_at < now() - interval '2 minutes'
  LOOP
    readable_type := CASE batch.event_type
      WHEN 'admin_new_user'         THEN 'New sign-ups'
      WHEN 'admin_stream_started'   THEN 'Streams started'
      WHEN 'admin_new_creator'      THEN 'New communities'
      WHEN 'admin_new_subscription' THEN 'New subscriptions'
      WHEN 'admin_new_tip'          THEN 'New tips'
      WHEN 'admin_new_transaction'  THEN 'Transactions'
      WHEN 'admin_ticket_sold'      THEN 'Tickets sold'
      WHEN 'admin_stripe_failure'   THEN 'Stripe failures'
      WHEN 'admin_stripe_verified'  THEN 'Stripe verifications'
      WHEN 'admin_new_waitlist'     THEN 'Waitlist sign-ups'
      ELSE replace(batch.event_type, 'admin_', '')
    END;

    readable_title := CASE
      WHEN batch.event_count = 1
        THEN COALESCE((batch.metadata->>'title')::text, readable_type)
      ELSE batch.event_count::text || ' ' || readable_type
    END;

    readable_body := CASE
      WHEN batch.event_count = 1
        THEN COALESCE((batch.metadata->>'body')::text, 'Event occurred')
      ELSE batch.event_count::text || ' events in the last few minutes'
    END;

    FOR admin_record IN SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      PERFORM insert_admin_notification(
        admin_record.user_id,
        batch.event_type,
        readable_title,
        readable_body,
        '/admin'
      );
    END LOOP;

    UPDATE admin_notification_batch SET dispatched = true WHERE id = batch.id;
  END LOOP;
END;
$$;