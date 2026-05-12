# Restore: split-sheets

**Description:** Songwriter split sheets + writer rows

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/SplitSheetsPage.tsx
- src/features/music/hooks/useSplitSheets.ts
- src/features/music/components/SplitWriterRow.tsx

## Routes / mounts removed
<Route path="splits" element={<ProtectedRoute><SplitSheetsPage /></ProtectedRoute>} />

## Restore in 3 steps
1. `git mv src/_archive/split-sheets/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: split-sheets").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: split-sheets" comments.

DB tables, edge functions, and migrations were never touched.
