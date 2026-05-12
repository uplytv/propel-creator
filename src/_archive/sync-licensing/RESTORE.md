# Restore: sync-licensing

**Description:** Briefs/listings/sessions for music licensing to film/TV/ads

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/pages/SyncLicensingPage.tsx
- src/features/music/hooks/useSyncLicensing.ts
- src/features/music/hooks/useSyncSessions.ts
- src/features/music/components/SyncBriefCard.tsx
- src/features/music/components/SyncListingCard.tsx
- src/features/music/components/SyncSessionCard.tsx
- src/features/music/components/SyncSessionCreateForm.tsx

## Routes / mounts removed
<Route path="sync" element={<SyncLicensingPage />} />

## Restore in 3 steps
1. `git mv src/_archive/sync-licensing/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: sync-licensing").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: sync-licensing" comments.

DB tables, edge functions, and migrations were never touched.
