# bio-page (archived 2026-05-13)

`/:username` and `/:username/page` previously rendered `BioPage` (link-in-bio).
Consolidated into the unified `SocialCreatorPage` at `/@:slug`. `/:username`
now 301-redirects via `UsernameRedirect`.

To restore:
1. Move files back: `BioPage.tsx → src/pages/`, `LinkInBioRenderer.tsx → src/components/pages/`
2. Restore the `/:username` and `/:username/page` routes in `src/App.tsx` to `<BioPage />`.
3. Remove the `UsernameRedirect` mount.

Data tables `creator_pages` and `bio_links` are untouched — `LinksShelf`
on the new page reads from `bio_links` directly.
