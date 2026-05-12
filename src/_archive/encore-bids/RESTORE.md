# Restore: encore-bids

**Description:** Encore song bidding panel on concert pages

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/hooks/useEncoreBids.ts
- src/features/music/components/EncoreBidPanel.tsx

## Routes / mounts removed
<EncoreBidPanel concertId={concert.id} /> in ConcertPage.tsx (line ~64)

## Restore in 3 steps
1. `git mv src/_archive/encore-bids/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: encore-bids").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: encore-bids" comments.

DB tables, edge functions, and migrations were never touched.
