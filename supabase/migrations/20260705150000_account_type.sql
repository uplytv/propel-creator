-- Two-sided access model: distinguish free MEMBER accounts from CREATOR/founder
-- accounts (the paid $97/$297/$497 funnel).
--
-- account_type semantics:
--   'creator' — goes through creator onboarding + approval waitlist (existing flow)
--   'member'  — free account; browses, joins communities, buys, takes free courses;
--               never enters the creator onboarding/approval funnel.
--
-- The default is 'creator' (fail-closed) on purpose: profile rows are created by
-- the handle_new_user trigger before the app can declare intent, and every
-- pre-existing signup path (email, Google OAuth redirect, referral/invite) expects
-- the creator funnel. Member signups explicitly mark themselves 'member' from
-- /auth?as=member via a self-row UPDATE under the existing profiles RLS policies.
-- Defaulting to 'member' instead would let fresh creator signups (whose intent
-- can't be written yet, e.g. OAuth redirects) skip onboarding entirely.
--
-- RLS: intentionally NO new policies. The column rides the existing profiles
-- policies (self select/update). Nothing permissive is added. Self-setting this
-- column grants no privilege: 'creator' only routes INTO the approval funnel,
-- and is_approved / paid gating are unchanged.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'creator';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('creator', 'member'));

-- Backfill: everyone who exists today came through the creator/founder funnel.
-- (The NOT NULL DEFAULT above already fills existing rows; this is explicit belt
-- and braces so the intent survives future default changes.)
UPDATE public.profiles SET account_type = 'creator' WHERE account_type IS DISTINCT FROM 'creator';
