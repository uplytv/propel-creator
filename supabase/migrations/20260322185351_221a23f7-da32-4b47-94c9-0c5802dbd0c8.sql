
-- Add username_slug and referrer info to affiliate_links
ALTER TABLE public.affiliate_links ADD COLUMN IF NOT EXISTS username_slug text;

-- Add referrer info to waitlist
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referrer_display_name text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referrer_avatar_url text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referrer_username text;
