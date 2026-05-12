# Restore: publishing

**Description:** Publishing registration + liner notes composer

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/PublishingPage.tsx
- src/features/music/hooks/usePublishing.ts
- src/features/music/hooks/useLinerNotes.ts
- src/features/music/components/PublishingRegistrationCard.tsx
- src/features/music/components/LinerNoteCard.tsx
- src/features/music/components/LinerNoteComposer.tsx

## Routes / mounts removed
<Route path="publishing" element={<ProtectedRoute><PublishingPage /></ProtectedRoute>} />

## Restore in 3 steps
1. `git mv src/_archive/publishing/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: publishing").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: publishing" comments.

DB tables, edge functions, and migrations were never touched.
