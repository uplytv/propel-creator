-- Trial Step-1 contact fields on the owner's profiles row.
--
-- 20260707070000 already declared profiles.phone and profiles.company_name,
-- but the live project (dbjlhmbgskvhuzqvqfrl) does not have either column:
-- PostgREST returns 400 ("column profiles.phone does not exist" /
-- PGRST204 schema cache) when the trial modal writes them back after signup.
-- That write is PATCH /rest/v1/profiles?user_id=eq.<uuid> with no select param.
-- Re-declaring here is idempotent so a database that skipped or rolled back
-- the earlier migration still gains the columns on the next push.
--
-- RLS: public.profiles already has owner-scoped SELECT/UPDATE
-- (auth.uid() = user_id) plus the admin SELECT policy. New columns are
-- covered by those policies. profiles_public is column-enumerated and does
-- not include phone or company_name, so they stay off the public surface.
-- Re-assert RLS enabled. No policy is dropped or widened.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text;

COMMENT ON COLUMN public.profiles.phone IS
  'Contact phone from trial signup Step 1 (self-reported, unverified). Owner-readable only — profiles SELECT is auth.uid() = user_id; NOT in profiles_public.';
COMMENT ON COLUMN public.profiles.company_name IS
  'Company / brand name from trial signup Step 1. Owner-readable only — NOT in profiles_public.';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
