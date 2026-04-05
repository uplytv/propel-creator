ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS ai_pitch text;
ALTER TABLE public.live_products ADD COLUMN IF NOT EXISTS urgency_message text;