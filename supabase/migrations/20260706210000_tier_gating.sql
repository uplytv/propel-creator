-- ═══════════════════════════════════════════════════════════════════════════
-- Tier-scoped content gating (ARPU ladder).
--
-- Today ANY active/trialing member_subscription unlocks ALL of a creator's
-- classroom content (has_creator_access, migration 20260611160000). This
-- migration lets creators require a MINIMUM subscription tier per classroom
-- module / lesson, so a $99 tier can unlock more than a $9 tier.
--
-- ADDITIVE ONLY — backward compatible by construction:
--   * min_tier_rank is NULL everywhere after this migration, and the extended
--     policies short-circuit on `min_tier_rank IS NULL` back to the EXACT
--     pre-existing condition (is_free OR has_creator_access(creator_id)).
--   * has_creator_access is NOT modified. No drops, no data destroyed.
--   * Community access grants (resource_type='community') keep unlocking
--     everything — they are not tier-scoped (same clause as
--     has_creator_access, verbatim).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. subscription_tiers.tier_rank ─────────────────────────────────────────
-- Higher rank = more expensive = unlocks more. Backfilled from price ordering
-- per creator (1 = cheapest). Ranked across ALL tiers (active + inactive)
-- because members may still hold subscriptions to deactivated tiers.
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS tier_rank integer;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY creator_id
           ORDER BY price_monthly ASC, created_at ASC, id ASC
         ) AS rnk
  FROM public.subscription_tiers
)
UPDATE public.subscription_tiers st
SET tier_rank = ranked.rnk
FROM ranked
WHERE st.id = ranked.id
  AND st.tier_rank IS NULL;

COMMENT ON COLUMN public.subscription_tiers.tier_rank IS
  'Tier ladder position per creator (1 = cheapest). Backfilled from price_monthly ordering. Content gated with min_tier_rank N requires a subscription whose tier_rank >= N.';

-- ── 2. min_tier_rank on classroom modules + lessons ─────────────────────────
-- NULL = every member (today's behavior, unchanged).
ALTER TABLE public.classroom_modules
  ADD COLUMN IF NOT EXISTS min_tier_rank integer;
ALTER TABLE public.classroom_lessons
  ADD COLUMN IF NOT EXISTS min_tier_rank integer;

DO $$ BEGIN
  ALTER TABLE public.classroom_modules
    ADD CONSTRAINT classroom_modules_min_tier_rank_check
    CHECK (min_tier_rank IS NULL OR min_tier_rank >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.classroom_lessons
    ADD CONSTRAINT classroom_lessons_min_tier_rank_check
    CHECK (min_tier_rank IS NULL OR min_tier_rank >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.classroom_modules.min_tier_rank IS
  'Minimum subscription_tiers.tier_rank required to view. NULL = any member (legacy behavior).';
COMMENT ON COLUMN public.classroom_lessons.min_tier_rank IS
  'Minimum subscription_tiers.tier_rank required to view. NULL = any member (legacy behavior).';

-- ── 3. has_tier_access(p_creator_id, p_min_rank) ─────────────────────────────
-- True when:
--   * p_min_rank IS NULL (content not tier-scoped), OR
--   * caller is the creator, OR
--   * caller has an active/trialing subscription to this creator whose tier
--     rank >= p_min_rank (falls back to price-derived rank for tiers created
--     after this migration that have no tier_rank yet), OR
--   * caller holds an unrevoked community access grant (grants are not
--     tier-scoped — verbatim the grant clause from has_creator_access).
CREATE OR REPLACE FUNCTION public.has_tier_access(p_creator_id uuid, p_min_rank integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_min_rank IS NULL
    -- the creator themselves
    OR auth.uid() = p_creator_id
    -- active/trialing subscription at (or above) the required tier rank
    OR EXISTS (
      SELECT 1
      FROM public.member_subscriptions ms
      JOIN public.subscription_tiers st ON st.id = ms.tier_id
      WHERE ms.member_id = auth.uid()
        AND ms.creator_id = p_creator_id
        AND ms.status IN ('active', 'trialing')
        AND COALESCE(
          st.tier_rank,
          -- price-derived fallback for un-ranked tiers (mirrors the backfill:
          -- 1 + tiers of this creator ordered before it by price, created_at)
          1 + (
            SELECT COUNT(*)::integer
            FROM public.subscription_tiers t2
            WHERE t2.creator_id = st.creator_id
              AND t2.id <> st.id
              AND (
                t2.price_monthly < st.price_monthly
                OR (t2.price_monthly = st.price_monthly AND t2.created_at < st.created_at)
              )
          )
        ) >= p_min_rank
    )
    -- explicit community access grant (paid checkout or free-join grant) —
    -- unchanged from has_creator_access: grants unlock everything
    OR EXISTS (
      SELECT 1
      FROM public.access_grants ag
      JOIN public.creator_spaces cs ON cs.id = ag.resource_id
      WHERE ag.user_id = auth.uid()
        AND ag.revoked_at IS NULL
        AND ag.resource_type = 'community'
        AND cs.creator_id = p_creator_id
    );
$$;

REVOKE ALL ON FUNCTION public.has_tier_access(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.has_tier_access(uuid, integer) TO authenticated;

-- ── 4. Extend the classroom SELECT policies ──────────────────────────────────
-- Prior condition (20260611160000, re-applied 20260615053215), preserved
-- verbatim as the base:   is_free OR has_creator_access(creator_id)
-- New shape:
--   is_free                                     -- free stays free, always
--   OR ( has_creator_access(creator_id)         -- today's member check
--        AND (min_tier_rank IS NULL             -- not tier-scoped → as today
--             OR has_tier_access(creator_id, min_tier_rank)) )
-- With min_tier_rank NULL (all existing rows) this evaluates to exactly the
-- previous condition. Owner CRUD policies ("Creators manage …") are untouched.

DROP POLICY IF EXISTS "View free or accessible modules" ON public.classroom_modules;
CREATE POLICY "View free or accessible modules"
  ON public.classroom_modules FOR SELECT TO authenticated
  USING (
    is_free
    OR (
      public.has_creator_access(creator_id)
      AND (min_tier_rank IS NULL OR public.has_tier_access(creator_id, min_tier_rank))
    )
  );

DROP POLICY IF EXISTS "View free or accessible lessons" ON public.classroom_lessons;
CREATE POLICY "View free or accessible lessons"
  ON public.classroom_lessons FOR SELECT TO authenticated
  USING (
    is_free
    OR (
      public.has_creator_access(creator_id)
      AND (min_tier_rank IS NULL OR public.has_tier_access(creator_id, min_tier_rank))
    )
  );

-- ── 5. Aggregate counts for the pricing page "Unlocks N gated lessons" hint ──
-- SECURITY DEFINER because gated rows are (correctly) invisible to under-tier
-- members — this exposes ONLY per-rank lesson counts, no content. A lesson's
-- effective requirement is the stricter of its own and its module''s rank.
-- is_free lessons are excluded (they stay free regardless of tier).
CREATE OR REPLACE FUNCTION public.tier_gated_lesson_counts(p_creator_id uuid)
RETURNS TABLE(min_rank integer, lesson_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    GREATEST(COALESCE(l.min_tier_rank, 0), COALESCE(m.min_tier_rank, 0)) AS min_rank,
    COUNT(*) AS lesson_count
  FROM public.classroom_lessons l
  JOIN public.classroom_modules m ON m.id = l.module_id
  WHERE l.creator_id = p_creator_id
    AND l.is_free = false
    AND GREATEST(COALESCE(l.min_tier_rank, 0), COALESCE(m.min_tier_rank, 0)) > 0
  GROUP BY 1;
$$;

REVOKE ALL ON FUNCTION public.tier_gated_lesson_counts(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.tier_gated_lesson_counts(uuid) TO authenticated, anon;

-- Re-assert RLS idempotently (no-table-without-RLS rule; both already enabled).
ALTER TABLE public.classroom_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
