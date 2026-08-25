# ANOUSHA ONBOARDING — SheWins launch runbook

Owner + Anousha, work through this top-to-bottom (~45 min).
Anousha = Anousha Nik · Instagram [@anousha.nik](https://www.instagram.com/anousha.nik/) · founder of **SheWins**.
Brand line (hers, verbatim): *"Plan the life. Build the wealth. Become Her."*

What already ships in code (no in-app setup needed):

| Surface | URL | Source |
|---|---|---|
| Link-in-bio hub (the IG funnel front door) | `/anousha` | `App.tsx` roster link-route list → `ArtistLinkPage` |
| Editorial website (business persona: "Work with me" + **Book a call**) | `/anousha-site` | roster entry → `ArtistSiteTemplate` |
| Blog (3 posts live) | `/anousha/blog` | roster `posts[]` |
| Community page (SheWins) | `/anousha/community` | roster `community` |
| Roster card + curated search | `/roster`, in-app search | roster entry (automatic) |

Aliases `anousha-nik`, `anoushanik`, `anousha.nik`, and `shewins` resolve to the same roster entry for the shared `/:slug/*` surfaces (blog/community/site resolution via `findArtistBySlug`). The `/:username` catch-all is still last in `App.tsx`.

> **Route note (important):** a seeded creator-tenant page ("Anousha Nikjouian — DMV Real Estate", `CreatorTenantPage`) was previously reachable at `/anousha` through the `/:username` catch-all if a DB profile with username `anousha` exists. The new hard-coded `/anousha` roster route now **intentionally shadows it** — the SheWins link hub is her front door. If the realtor tenant page must stay reachable, give that DB profile a different username (e.g. `anoushahomes`); its `/anousha/links` page is also unaffected only if renamed. Confirm with Anousha which presence wins.

---

## 1. THE FUNNEL (Instagram → UPLY → revenue)

```
Instagram @anousha.nik
  │  bio link: uply.tv/anousha        ← the ONE link, never changes
  ▼
uply.tv/anousha  (link hub)
  ├─► SheWins community  → /anousha/community  → join (paid tier)
  ├─► Book a call        → /anousha-site#booking → Calendly (placeholder now)
  ├─► Blog               → /anousha/blog       (trust + SEO)
  ├─► Official site      → /anousha-site       (story + Work with me form)
  └─► Instagram          → back-loop for new visitors
```

- **IG bio:** set the link to `uply.tv/anousha` and the bio line to "Plan the life. Build the wealth. Become Her. ↓" (or her wording). One link, forever — everything downstream can change without touching the bio.
- **Story-highlight strategy:** create three permanent highlights — **SheWins** (what the community is + "link in bio"), **Start Here** (the three blog posts, one story each, ending on the bio link), **Book a Call** (for speaking/coaching inquiries). Every content story ends with the same CTA frame pointing at the bio link.
- **Post → funnel routing:** vision/discipline/wealth content posts CTA to the matching blog post; community-tease posts CTA straight to `/anousha/community`; anything "work with me" CTAs to the call scheduler.
- **Founding-offer cross-link:** while founding-member enrollment is open, pin a post + highlight slide framing SheWins membership as the founding offer ("founding members lock the launch price"), linking to `/anousha/community`. If the owner wants her on the platform-wide `/founding-offer` page motion, coordinate before announcing.

## 2. Asset drop-in checklist (owner does these as Anousha delivers)

- [ ] **Portrait** → upload to the assets bucket, set `portraitUrl` on her entry in `src/data/artistRoster.ts`. Until then the hero renders the centered no-portrait layout (template self-hides the image column). **Do not scrape or hotlink Instagram images.**
- [ ] **3–5 gallery images** → add a `gallery` array to her roster entry (see Arian's entry for the shape: `{ url, alt, caption }`).
- [ ] **IG post URLs for embeds** → replace the single profile-level `videos` item with per-post entries: `videos: [{ title, instagramUrl }]` — one per reel she wants featured (sonuha pattern).
- [ ] **Real Calendly link** → replace `bookCallUrl: "https://calendly.com/PLACEHOLDER-anousha/intro"` with her real scheduler URL. The "Book a call" button on `/anousha-site` renders above the inquiry form; if she'd rather not offer calls, delete the field and the section falls back to form-only.
- [ ] **Booking email** → `bookingEmail` is `hello@uply.tv` (UPLY-managed placeholder). Swap for her address; also update the `email` entry in `socials`.
- [ ] **Blog cover images** (optional) → set `coverUrl` on each post once she supplies images.

## 3. Account setup (in-app, mirrors Blake's runbook)

1. Anousha signs up at `/auth` (creator persona) with an email she controls — [Anousha: confirm which email].
2. Username: claim **anousha** — note the tenant-page conflict above; resolve which profile owns the `anousha` username before launch.
3. Complete `/onboarding`; creator type: Coach.
4. Connect Stripe from the dashboard **before** the paid tier goes live — the 95/5 split needs a connected account.
5. Create the real community: name **SheWins**, description mirroring the roster copy (including the "financial education, not financial advice" line), feed categories **#vision**, **#discipline**, **#wealth**, **#wins**.
6. Pinned founding post: the core message + house rules + the wealth disclaimer.
7. Drip welcome flow (`/dashboard/drip-sequences`, trigger `new_subscriber`): Day 0 welcome + One Ordinary Day exercise → Day 2 discipline system post → Day 4 wealth post (with disclaimer footer) → Day 7 invite to the next live vision session. All copy needs Anousha's sign-off; every email footer carries the education-only disclaimer.
8. First live: "SheWins Vision Session 001" from `/go-live` — 20 min One Ordinary Day walkthrough, 20 min working backwards, 20 min Q&A.

## 4. Pricing decision (owner + Anousha decide, then update code)

- Community `priceUsd` is a **$49/mo placeholder** — not announced anywhere, decide before launch.
- Options: keep a public monthly price (update `priceUsd`), or go premium/application-only by adding `contactForPricing: true` to her `community` (hides the price, routes prospects through the inquiry form — the Samuel Onuha pattern).
- Founding-member framing: whatever the price, lock it for founding members and say so — it matches `membersLabel: "Founding members"` and the hero chip.
- Perk cadence is a delivery promise: "weekly" vision sessions must actually be weekly. Confirm she can sustain it before launch.

## 5. Placeholders awaiting ANOUSHA'S SIGN-OFF

Nothing below goes live as fact until Anousha confirms it in writing:

1. `bio` — paragraph 2 contains `[Anousha: your own story — where this started and the turning point]`. No biography facts were invented; she supplies them.
2. `milestones` — 2 of 3 entries are `[Anousha: …]` prompts (where SheWins started; the turning point).
3. `stats` → "Based in" is `[Anousha: city]`.
4. `socials` email sub-line — `[Anousha: confirm public address]` (currently routed via hello@uply.tv).
5. `bookingEmail` — `hello@uply.tv` placeholder; swap for hers.
6. `bookCallUrl` — `https://calendly.com/PLACEHOLDER-anousha/intro` placeholder; swap for her real scheduler.
7. Community `priceUsd: 49` — placeholder; confirm price or switch to `contactForPricing`.
8. Community perk cadences ("weekly" sessions) — delivery promises she must commit to.
9. `joinedAt: 2026-08-25` — cosmetic "Est." date; confirm.
10. `portraitUrl` — intentionally omitted; awaiting an uploaded photo. Never scrape Instagram.
11. All three blog posts — original copy in her brand voice with zero personal-history claims; she should read and sign off before promotion.
12. Hero chip "founding member enrollment open" — only true once the community tier actually exists in-app; create the tier before promoting the link.
13. Tenant-page conflict (`/anousha` realtor page) — she confirms which presence owns the URL.

## 6. Content rules going forward

- **No fabricated or unverifiable numbers anywhere** — no member counts, income claims, client results, or "she went from X to Y" stories on any UPLY surface without written proof and sign-off.
- Wealth/money content always carries the education-only disclaimer (already in roster `disclaimers`, rendered by `ArtistDisclaimers` on site/blog/community; also inline at the end of the wealth post).
- Accent is `#D6336C` (rich berry) on a dark berry gradient — distinct from Morvarid's bright pink `#E94A8C` and inside the approved palette (never green).
