# Restore: fan-radio

**Description:** User-curated fan radio player

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/FanRadioPlayerPage.tsx
- src/features/music/hooks/useFanRadio.ts
- src/features/music/components/FanRadioShelf.tsx

## Routes / mounts removed
<Route path="radio-player" element={<FanRadioPlayerPage />} />

## Restore in 3 steps
1. `git mv src/_archive/fan-radio/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: fan-radio").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: fan-radio" comments.

DB tables, edge functions, and migrations were never touched.
