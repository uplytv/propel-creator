ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IS NULL OR account_type = ANY (ARRAY['creator'::text, 'member'::text, 'business'::text]));