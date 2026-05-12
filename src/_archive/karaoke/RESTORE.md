# Restore: karaoke

**Description:** Karaoke mode and scoring

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/KaraokePage.tsx
- src/features/music/components/KaraokeMode.tsx
- src/features/music/hooks/useKaraokeScores.ts

## Routes / mounts removed
<Route path="karaoke" element={<KaraokePage />} />

## Restore in 3 steps
1. `git mv src/_archive/karaoke/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: karaoke").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: karaoke" comments.

DB tables, edge functions, and migrations were never touched.
