# Restore: dj-console

**Description:** DJ console live mixing surface

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/DJConsolePage.tsx

## Routes / mounts removed
<Route path="dj" element={<DJConsolePage />} />

## Restore in 3 steps
1. `git mv src/_archive/dj-console/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: dj-console").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: dj-console" comments.

DB tables, edge functions, and migrations were never touched.
