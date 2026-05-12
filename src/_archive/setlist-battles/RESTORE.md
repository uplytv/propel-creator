# Restore: setlist-battles

**Description:** Setlist battle voting (creator + candidate flows)

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/hooks/useSetlistBattles.ts
- src/features/music/hooks/useSetlistVoting.ts
- src/features/music/components/SetlistBattleCard.tsx
- src/features/music/components/SetlistBattleCreateForm.tsx
- src/features/music/components/SetlistCandidateCard.tsx
- src/features/music/components/SetlistCandidateForm.tsx

## Routes / mounts removed
(none — internal feature only, no top-level route)

## Restore in 3 steps
1. `git mv src/_archive/setlist-battles/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: setlist-battles").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: setlist-battles" comments.

DB tables, edge functions, and migrations were never touched.
