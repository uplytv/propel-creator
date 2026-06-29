ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS og_image_url text;

ALTER TABLE public.artist_profiles
ADD COLUMN IF NOT EXISTS og_image_url text;