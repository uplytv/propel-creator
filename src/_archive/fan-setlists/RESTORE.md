# Restore: fan-setlists

**Description:** Fan-built concert setlists

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/hooks/useFanSetlists.ts
- src/features/music/components/FanSetlistCard.tsx
- src/features/music/components/FanSetlistSongRow.tsx

## Routes / mounts removed
(none — internal feature only, no top-level route)

## Restore in 3 steps
1. `git mv src/_archive/fan-setlists/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: fan-setlists").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: fan-setlists" comments.

DB tables, edge functions, and migrations were never touched.
