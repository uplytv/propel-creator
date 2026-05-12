# `src/_archive/` — Restoration index

Files here are NOT deleted. They were moved out of the active source tree as part of UPLY launch polish (Prompt 11) to reduce surface area before launch. Every move is reversible with `git mv`.

The folder is excluded from `tsconfig.app.json` (`"exclude": ["src/_archive"]`) so archived code never participates in build/typecheck even if it has stale internal imports.

## Sections

### `duplicates/` — Section 2 archive

| Archived path | Canonical survivor | Reason |
|---|---|---|
| `duplicates/components/live/StreamCard.tsx` | `src/components/live/StreamCardNew.tsx` | StreamCard had 0 importers; StreamCardNew is wired into Live.tsx. |
| `duplicates/components/social/EventCheckIn.tsx` | `src/components/events/EventCheckIn.tsx` | Social variant had 0 importers and was 99 lines vs the events variant's 222 lines. |
| `duplicates/components/discovery/CategoryHeroBanner.tsx` | — | 0 importers. |
| `duplicates/components/discovery/DiscoveryRows.tsx` | — | 0 importers. |
| `duplicates/components/discovery/HoverPreviewCard.tsx` | — | 0 importers. |

### Restoration

```bash
git mv src/_archive/duplicates/components/live/StreamCard.tsx src/components/live/StreamCard.tsx
```

## Files reviewed but kept (intended-archive that proved live)

These files appeared unused by direct grep but were transitively imported by alive components — they were briefly moved and immediately restored:

- `src/components/discover/{ContentRail, DiscoverHero, DiscoverStoriesRail, EventsRail}.tsx` — all consumed by `DiscoverShowcase.tsx`.
- `src/components/discovery/LiveBadge.tsx` — consumed by `DiscoveryFeedCard.tsx`.

## Deviations from Prompt 11

1. **EventDiscoveryGrid pair NOT archived.** The two files (`events/` and `social/`) are not duplicates — they serve disjoint feature trees with coincidental name collision. Archiving either would break live pages.
2. **Homepage variants NOT archived.** All 8 audience-specific homepage files (`HomepageMusicians/Streamers/Educators/LiveCommerce/Events/TV/Cultural/B2B`) are stacked sections of the live single-page `Landing.tsx`, not selectable variants. Archiving any would break the homepage.
3. **Gating canonical = `GatedContent` (per Core memory), not `StripeGate`.** `ContentGate` and `StripeGate` received `@deprecated` file headers but were NOT moved (live importers exist). `PaywallModal` is internally consumed by `GatedContent` and was left untouched.

## Future sections

- `<feature>/` — Section 3 speculative-feature archives (pending)
