# AARUSH ONBOARDING — creator-educator setup runbook

Owner + Aarush, work through this top-to-bottom in one sitting (~45 min).
Aarush = Aarush Nijhawan · Instagram [@aarushnijha](https://www.instagram.com/aarushnijha) · founder of Rush Impact Media · Rutgers–New Brunswick · Edison, NJ.

What already ships in code (no in-app setup needed):

| Surface | URL | Source |
|---|---|---|
| Editorial website (business persona: "Work with me") | `/aarush-site` | roster entry → `ArtistSiteTemplate` |
| Blog (3 posts live) | `/aarush/blog` | roster `posts[]` |
| Community page (The Rush) | `/aarush/community` | roster `community` |
| Courses (both tracks) | `/aarush/courses` | roster `courses[]` |
| Roster card + curated search | `/roster`, in-app search | roster entry (automatic) |

Zero App.tsx changes were made — the roster route loop picks Aarush up automatically. The `/:username` catch-all is still last.

---

## 1. Create Aarush's creator account

1. Aarush signs up at `/auth` (creator persona) with an email he controls — [Aarush: confirm which email].
2. Username: claim **aarush** (matches roster slug) — do this before launch so nobody squats it. Aliases `aarushnijha` and `aarush-nijhawan` already resolve to the roster entry via `findArtistBySlug`.
3. Complete `/onboarding`; creator type: Marketer / Educator.
4. Connect Stripe from the dashboard (Stripe Connect onboarding) **before** any paid tier or course goes live — the 95/5 split only works with a connected account.
5. Founding-creator badge: mark his profile with the founding-creator flag so `FoundingCreatorBadge` (`src/components/shared/FoundingCreatorBadge.tsx`) renders on his public profile.
6. Upload a portrait photo to the assets bucket, then fill in `portraitUrl` on his roster entry in `src/data/artistRoster.ts`. Until then the site renders the initial-based placeholder in `ArtistSiteTemplate`. **Do not scrape or hotlink Instagram images.**

## 2. Community: "The Rush"

Create one community (in-app):

- Name: **The Rush** — [Aarush: confirm name] (derived from Rush Impact Media).
- Description (mirror the roster copy): a community for creators and small brands learning to grow with short-form content and smart marketing systems. Weekly planning, batching, hook writing, and honest feedback on the reps.
- Feed categories: create **#content**, **#growth**, and **#wins** so every post is tagged from day one.
- Founding-member pinned post: paste the disclaimer line ("Education only — marketing outcomes depend on your product, market, and consistency.")

## 3. Classroom: TWO module tracks

Create two module tracks that mirror the public course outlines (roster `courses[]` in `src/data/artistRoster.ts`):

**Track 1 — Short-Form Content Engine** (7 lessons)
1. Finding your content pillars
2. The batching workflow: record a week in an hour
3. Hooks that stop the scroll
4. Before/after and myth-vs-fact formats
5. Editing for retention
6. Posting cadence and consistency
7. Reading your analytics without fooling yourself

**Track 2 — Marketing Systems 101** (6 lessons)
1. Positioning before promotion
2. Building a simple content calendar
3. Evergreen vs trending content
4. Turning followers into email subscribers
5. Basic offers and landing pages
6. Measuring what actually converts

## 4. Membership tiers — honest guidance (read before configuring)

**How gating actually works today:** tier gating is **hierarchical rank-based** — content unlocks when `tier_rank >= min_rank` (`src/hooks/useTierGating.ts`; classroom modules gate on `min_rank` too, see `src/components/space/PricingTab.tsx`). A higher-rank member sees everything below their rank.

**What that means for Aarush:** truly-exclusive *parallel* tiers (e.g. "Content-only" vs "Systems-only" where neither sees the other's content) are **not expressible** with the current model. Do not promise it. Two honest options:

- **Option A (recommended for launch): single all-access membership.** One tier — "The Rush" — at [Aarush: confirm price, $/mo]. Both tracks included, weekly planning, monthly Q&A. Simplest to sell, zero gating surprises.
- **Option B: ladder.** Rank 1 = "Content" (Short-Form Content Engine + #content feed), Rank 2 = "All-Access" (adds Marketing Systems 101 + planning session). Works because it's hierarchical — but note the asymmetry: there is no way to buy Systems *without* Content in this layout.

**Enhancement flag:** file "parallel tier scoping" (non-hierarchical, per-track tier → content mapping) as a product enhancement. Until it ships, Option A or B only.

## 5. Drip sequence (welcome flow)

In `/dashboard/drip-sequences` (workflow builder):

- Trigger: **new_subscriber** (`src/components/drip/workflowTriggers.ts`)
- Suggested 4-email welcome flow (all copy needs Aarush's sign-off):
  1. Day 0 — "Welcome to The Rush": house rules, the "batch the work" ethos, links to both tracks.
  2. Day 2 — "Start here: Short-Form Content Engine lesson 1" + the batching checklist.
  3. Day 4 — "Marketing Systems 101: positioning before promotion" + the pillars worksheet.
  4. Day 7 — "Your first live session": invite to the next planning session / Q&A.
- Emails send from notify.uply.tv (Resend) — every email footer must carry the "education only, results vary" disclaimer (§7).

## 6. First live stream + launch event

- **Live:** set up Aarush's first stream from `/go-live` — suggested format: "The Rush · Open Planning Session" (free or low-price), agenda: 20 min pillars + hooks, 20 min batching walkthrough, 20 min Q&A.
- **Launch event + promoter links:** create the event from `/events/create`; add promoters via the event's promoter manager (`EventPromotersManager`) so early supporters get tracked promo links (`src/lib/eventPromo.ts`). Tier-based tickets are the canonical system.

## 7. DISCLOSURE CHECKLIST (non-negotiable — verify before announcing)

Exact line:
- **Marketing:** "Educational content only — marketing outcomes depend on your product, market, and consistency. No income or growth results are guaranteed."

Verify each surface:
- [x] `/aarush-site` footer — disclaimer (roster `disclaimers`, rendered by `ArtistDisclaimers`)
- [x] `/aarush/blog` list + every article footer — disclaimer (shared component) **and** inline at the end of each post body
- [x] `/aarush/community` — disclaimer in the description
- [x] `/aarush/courses` + each course page — disclaimer in each course summary
- [ ] In-app community description + pinned post — paste the disclaimer
- [ ] Classroom module intros — disclaimer on Lesson 1 of each track
- [ ] Drip emails — disclaimer in every footer
- [ ] Live streams — verbal disclaimer on air + in stream description

**Content rule going forward: no fabricated or unverifiable numbers anywhere.** No follower counts, revenue figures, client results, case-study numbers, or "grew from X to Y" framing on any UPLY surface unless Aarush provides written proof and explicit sign-off. Testimonials only with written permission + "results not typical" context.

## 8. Placeholders awaiting AARUSH'S SIGN-OFF (in `src/data/artistRoster.ts`)

Nothing below goes live as fact until Aarush confirms it in writing:

1. `milestones` — 3 of 4 entries are `[Aarush: …]` prompts (why he started creating, founding Rush Impact Media, the marketing lesson that reshaped how he teaches).
2. Community name **The Rush** — derived from Rush Impact Media; confirm.
3. Community `priceUsd` — set to `0` as a placeholder; confirm launch price before the tier is created (or the community page will render "$0").
4. Community perk cadences ("weekly" planning, "monthly" Q&A) — delivery promises he must commit to.
5. Course prices — Short-Form Content Engine and Marketing Systems 101 both set to `priceUsd: 0` as placeholders; confirm before publishing.
6. Course durations — both `[TBC]` until content is recorded.
7. `bookingEmail` intentionally omitted — confirm a public email he wants displayed, or keep it off.
8. Socials — currently only Instagram (`@aarushnijha`); add X/Twitter, TikTok, YouTube, LinkedIn, etc. as he confirms handles.
9. `joinedAt: 2026-07-01` — cosmetic "Est." date; confirm.
10. `portraitUrl` — intentionally omitted; awaiting an uploaded photo. Do not scrape Instagram.
11. All three blog posts — written in his voice with zero performance claims; he should read and sign off before promotion.

## 9. Known gaps / notes for the owner

- No bespoke legacy pages for Aarush (unlike Blake) — the roster surfaces are the entire presence, which keeps the story simple.
- Accent color is `#6B5BFF` (indigo-purple) — distinct from Blake's amber and inside the approved palette (never green).
- "Parallel tier scoping" enhancement (§4) — file it so per-track exclusive tiers become expressible later.
- Instagram bio wasn't accessible when this runbook was written; any additional bio facts should be added by Aarush himself, not inferred.
