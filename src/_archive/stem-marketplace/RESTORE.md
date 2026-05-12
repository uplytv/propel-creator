# Restore: stem-marketplace

**Description:** Buy/sell isolated track stems and stem stations

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/StemMarketplacePage.tsx
- src/features/music/hooks/useStemMarketplace.ts
- src/features/music/hooks/useStemStations.ts
- src/features/music/components/StemListingCard.tsx
- src/features/music/components/StemStationCard.tsx
- src/features/music/components/StemTrackRow.tsx

## Routes / mounts removed
<Route path="stems" element={<StemMarketplacePage />} />

## Restore in 3 steps
1. `git mv src/_archive/stem-marketplace/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: stem-marketplace").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: stem-marketplace" comments.

DB tables, edge functions, and migrations were never touched.
