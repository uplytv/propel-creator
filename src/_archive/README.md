# src/_archive — Insurance Policy

All archived code lives here. Nothing was deleted. tsconfig excludes this directory so broken intra-archive imports don't fail the build.

## Sections

### duplicates/
Lossless duplicates resolved in Section 2 (see duplicates/README.md if present, or git history).

### Section 3 — Speculative features (27 features, 2026-05-12)

| Feature | Description |
|---|---|
| [tour-city-requests](tour-city-requests/RESTORE.md) | Tour city nominations, suggestions, road postcards |
| [mailbag](mailbag/RESTORE.md) | Fan-question mailbag for artists |
| [music-labs](music-labs/RESTORE.md) | Hub linking to every speculative music feature |
| [nft-drops](nft-drops/RESTORE.md) | NFT-style limited digital collectibles for tracks |
| [studio-diary](studio-diary/RESTORE.md) | Studio session diary entries |
| [fan-setlists](fan-setlists/RESTORE.md) | Fan-built concert setlists |
| [concert-memories](concert-memories/RESTORE.md) | Post-concert memory cards from fans |
| [vinyl-drops](vinyl-drops/RESTORE.md) | Limited vinyl reservation drops |
| [fan-demos](fan-demos/RESTORE.md) | Fan demo submissions inbox |
| [collab-studio](collab-studio/RESTORE.md) | Collaborative track studio (track list + collaborators panel) |
| [publishing](publishing/RESTORE.md) | Publishing registration + liner notes composer |
| [fan-spotlights](fan-spotlights/RESTORE.md) | Fan spotlight nominations + submissions |
| [song-dedications](song-dedications/RESTORE.md) | Song dedication wall + form |
| [stem-marketplace](stem-marketplace/RESTORE.md) | Buy/sell isolated track stems and stem stations |
| [karaoke](karaoke/RESTORE.md) | Karaoke mode and scoring |
| [cover-contests](cover-contests/RESTORE.md) | Cover song contests, requests, submissions |
| [sync-licensing](sync-licensing/RESTORE.md) | Briefs/listings/sessions for music licensing to film/TV/ads |
| [mood-boards](mood-boards/RESTORE.md) | Visual mood boards + items |
| [fan-radio](fan-radio/RESTORE.md) | User-curated fan radio player |
| [royalties](royalties/RESTORE.md) | Royalty payouts, splits editor, distribution panel |
| [sample-packs](sample-packs/RESTORE.md) | Sample pack marketplace + shelves |
| [encore-bids](encore-bids/RESTORE.md) | Encore song bidding panel on concert pages |
| [setlist-battles](setlist-battles/RESTORE.md) | Setlist battle voting (creator + candidate flows) |
| [split-sheets](split-sheets/RESTORE.md) | Songwriter split sheets + writer rows |
| [audio-rooms](audio-rooms/RESTORE.md) | Live audio rooms (Clubhouse-style) |
| [trivia](trivia/RESTORE.md) | Trivia quizzes + leaderboards |
| [dj-console](dj-console/RESTORE.md) | DJ console live mixing surface |

## Restoring a feature
Each feature folder has a `RESTORE.md` with the exact `git mv` and route restoration steps. Database tables, migrations, and edge functions for these features were intentionally left in place — restoring is purely a file-move + route-restore operation.

## Section 4 — Algorithmic Radio (kept in production, NOT archived)
Implemented under the existing player surface — no new `/music/radio` route, no archived files.
- New table: `radio_station_exclusions` (per-user thumbs-down memory).
- New hook exports in `src/features/music/hooks/useRecs.ts`: `fetchRecs`, `excludeTrackFromStation`, `StationSeed`.
- `usePlayerStore` gains `station`, `stationTrackIds`, `startStation`, `stopStation`, `appendStationRecs`, `excludeFromStation`. `station` is persisted.
- `useAutoplayRadio` now consumes `fetchRecs` when a station is active (co-plays → daily_mixes → popular fallback), and falls back to genre/creator otherwise.
- `StartStationButton` surfaced on `TrackRow`, `TrackCard`, `ArtistHeader`. Station badge + thumbs-down + stop-station rendered in `PersistentPlayer` and `NowPlayingSheet`.
- PostHog events: `station_started`, `station_thumbs_down`, `autoplay_radio_continued`.
