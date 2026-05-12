# Restore: audio-rooms

**Description:** Live audio rooms (Clubhouse-style)

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/AudioRoomPage.tsx
- src/features/music/hooks/useAudioRooms.ts
- src/features/music/components/AudioRoomCard.tsx

## Routes / mounts removed
<Route path="room/:id" element={<AudioRoomPage />} /> + AudioRoomCard sections in MusicHome.tsx (line ~187) and MusicLivePage.tsx (line ~137)

## Restore in 3 steps
1. `git mv src/_archive/audio-rooms/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: audio-rooms").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: audio-rooms" comments.

DB tables, edge functions, and migrations were never touched.
