# Restore: sample-packs

**Description:** Sample pack marketplace + shelves

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/SamplePackPage.tsx
- src/features/music/hooks/useSampleMarketplace.ts
- src/features/music/components/SamplePackCard.tsx
- src/features/music/components/SampleMarketplaceShelf.tsx

## Routes / mounts removed
<Route path="samples" element={<SamplePackPage />} />

## Restore in 3 steps
1. `git mv src/_archive/sample-packs/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: sample-packs").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: sample-packs" comments.

DB tables, edge functions, and migrations were never touched.
