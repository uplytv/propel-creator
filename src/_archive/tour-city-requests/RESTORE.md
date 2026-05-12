# Restore: tour-city-requests

**Description:** Tour city nominations, suggestions, road postcards

**Status:** Archived in Section 3 of UPLY launch polish (2026-05-12). Files preserved, DB tables/edge functions untouched.

## Files moved
- src/features/music/hooks/useTourCityRequests.ts
- src/features/music/hooks/useTourSuggestions.ts
- src/features/music/hooks/useRoadPostcards.ts
- src/features/music/components/TourCityNominateForm.tsx
- src/features/music/components/TourCityRequestCard.tsx
- src/features/music/components/TourCityRow.tsx
- src/features/music/components/TourSuggestionCard.tsx
- src/features/music/components/RoadPostcardCard.tsx
- src/features/music/components/RoadPostcardForm.tsx

## Routes / mounts removed
(none — internal feature only, no top-level route)

## Restore in 3 steps
1. `git mv src/_archive/tour-city-requests/features src/features` (merges back into src/features/music tree)
2. Restore the route line(s) above into `src/App.tsx` and re-add the lazy import block (search for "archived: tour-city-requests").
3. (If applicable) restore the JSX/imports in surviving consumers — search the codebase for "archived: tour-city-requests" comments.

DB tables, edge functions, and migrations were never touched.
