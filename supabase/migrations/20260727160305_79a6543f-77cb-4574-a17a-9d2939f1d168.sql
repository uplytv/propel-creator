-- Add links jsonb to business_details (additive)
ALTER TABLE public.business_details
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Allow 'link_tap' event_type on business_page_events
ALTER TABLE public.business_page_events
  DROP CONSTRAINT IF EXISTS business_page_events_event_type_check;

ALTER TABLE public.business_page_events
  ADD CONSTRAINT business_page_events_event_type_check
  CHECK (event_type = ANY (ARRAY['view'::text, 'call_tap'::text, 'maps_tap'::text, 'lead_submit'::text, 'blog_view'::text, 'link_tap'::text]));