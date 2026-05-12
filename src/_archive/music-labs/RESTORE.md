# Restore: music-labs

**Description:** Hub linking to every speculative music feature

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/MusicLabsHub.tsx

## Routes / mounts removed
<Route path="labs" element={<MusicLabsHub />} /> + nav item { label: "Music Labs", icon: Sparkles, path: "/music/labs" } in AppLayout.tsx

## Restore in 3 steps
1. `git mv src/_archive/music-labs/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: music-labs").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: music-labs" comments.

DB tables, edge functions, and migrations were never touched.
