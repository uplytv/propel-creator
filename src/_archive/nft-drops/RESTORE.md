# Restore: nft-drops

**Description:** NFT-style limited digital collectibles for tracks

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/NFTDropsPage.tsx
- src/features/music/hooks/useNFTDrops.ts
- src/features/music/components/NFTDropCard.tsx

## Routes / mounts removed
<Route path="nft-drops" element={<NFTDropsPage />} />

## Restore in 3 steps
1. `git mv src/_archive/nft-drops/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: nft-drops").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: nft-drops" comments.

DB tables, edge functions, and migrations were never touched.
