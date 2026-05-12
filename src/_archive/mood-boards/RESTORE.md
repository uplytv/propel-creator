# Restore: mood-boards

**Description:** Visual mood boards + items

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/hooks/useMoodBoards.ts
- src/features/music/components/MoodBoardCard.tsx
- src/features/music/components/MoodBoardItemCard.tsx

## Routes / mounts removed
(none — internal feature only, no top-level route)

## Restore in 3 steps
1. `git mv src/_archive/mood-boards/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: mood-boards").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: mood-boards" comments.

DB tables, edge functions, and migrations were never touched.
