# Restore: royalties

**Description:** Royalty payouts, splits editor, distribution panel

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/RoyaltyPayoutsPage.tsx
- src/features/music/hooks/useRoyalties.ts
- src/features/music/hooks/useRoyaltySplits.ts
- src/features/music/components/RightsSplitsEditor.tsx
- src/features/music/components/DistributionPanel.tsx

## Routes / mounts removed
<Route path="royalties" element={<ProtectedRoute><RoyaltyPayoutsPage /></ProtectedRoute>} />

## Restore in 3 steps
1. `git mv src/_archive/royalties/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: royalties").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: royalties" comments.

DB tables, edge functions, and migrations were never touched.
