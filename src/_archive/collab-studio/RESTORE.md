# Restore: collab-studio

**Description:** Collaborative track studio (track list + collaborators panel)

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/CollabStudioPage.tsx
- src/features/music/hooks/useCollabStudio.ts
- src/features/music/components/CollabTrackList.tsx

## Routes / mounts removed
<Route path="collab" element={<ProtectedRoute><CollabStudioPage /></ProtectedRoute>} />

## Restore in 3 steps
1. `git mv src/_archive/collab-studio/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: collab-studio").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: collab-studio" comments.

DB tables, edge functions, and migrations were never touched.
