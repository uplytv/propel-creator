# Restore: fan-demos

**Description:** Fan demo submissions inbox

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/hooks/useFanDemos.ts
- src/features/music/hooks/useDemoInbox.ts
- src/features/music/components/FanDemoCard.tsx
- src/features/music/components/FanDemoSubmitForm.tsx
- src/features/music/components/DemoSubmissionCard.tsx
- src/features/music/components/DemoSubmissionForm.tsx

## Routes / mounts removed
(none — internal feature only, no top-level route)

## Restore in 3 steps
1. `git mv src/_archive/fan-demos/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: fan-demos").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: fan-demos" comments.

DB tables, edge functions, and migrations were never touched.
