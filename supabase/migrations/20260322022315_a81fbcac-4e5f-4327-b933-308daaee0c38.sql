
-- Backfill referral codes for existing profiles
UPDATE public.profiles SET referral_code = upper(substr(md5(random()::text || user_id::text), 1, 8)) WHERE referral_code IS NULL;
